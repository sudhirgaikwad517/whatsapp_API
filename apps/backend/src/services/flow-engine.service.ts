import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sendMetaOutboundMessage } from './meta-whatsapp.service.js';

// How long a flow session can sit idle (customer never replies to a
// question/button prompt) before the sweep in disappearing-messages-style
// worker treats it as abandoned and hands the conversation back to normal
// routing (AI/keyword-bot) instead of leaving it permanently stuck waiting.
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

interface FlowNodeData {
  nodeType?: 'trigger' | 'message' | 'buttons' | 'list' | 'condition' | 'collectInput' | 'saveData' | 'assignAgent' | 'end';
  label?: string;
  text?: string;
  bodyText?: string;
  buttons?: { id: string; title: string }[];
  listButtonLabel?: string;
  listRows?: { id: string; title: string; description?: string }[];
  variable?: string;
  operator?: 'equals' | 'notEquals' | 'contains';
  value?: string;
  promptText?: string;
  variableName?: string;
  fields?: { variableName: string; attributeKey: string }[];
}

interface FlowNode {
  id: string;
  data?: FlowNodeData;
  type?: string;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface InboundFlowInput {
  text: string;
  buttonReplyId?: string | null;
  listReplyId?: string | null;
}

function getNodeType(node: FlowNode): NonNullable<FlowNodeData['nodeType']> {
  if (node.data?.nodeType) return node.data.nodeType;
  // Legacy nodes (created before structured node data existed) only ever
  // carried a single free-text label string with an emoji prefix — inferred
  // here so flows built before this engine existed still run instead of
  // erroring out.
  const label = String(node.data?.label || '');
  if (/^🔘/.test(label)) return 'buttons';
  if (/^🔀/.test(label)) return 'condition';
  if (/^👤/.test(label)) return 'assignAgent';
  return 'message';
}

function cleanLegacyLabel(label: string): string {
  return label.replace(/^(💬 Send Message:|🔘 Interactive Buttons:|🔀 Condition:|👤 Assign Agent:)\s*/i, '').trim();
}

// Legacy "🔘 Interactive Buttons: [1. Pricing, 2. Address]" label parsing —
// these have no real per-button edge data (the old builder never recorded
// which edge belonged to which button), so routing for them falls back to
// "whichever edge leaves this node" rather than true per-button branching.
function parseLegacyButtons(label: string): { id: string; title: string }[] {
  const match = label.match(/\[(.+)\]/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((item, idx) => {
      const title = item.replace(/^\d+\.\s*/, '').trim();
      return { id: `legacy-btn-${idx + 1}`, title: title || `Option ${idx + 1}` };
    })
    .filter((b) => b.title);
}

function edgeFrom(edges: FlowEdge[], nodeId: string, handle?: string): FlowEdge | undefined {
  if (handle !== undefined) {
    return edges.find((e) => e.source === nodeId && (e.sourceHandle || null) === handle);
  }
  return edges.find((e) => e.source === nodeId);
}

function evaluateCondition(subject: string, operator: string | undefined, value: string | undefined): boolean {
  const s = subject.trim().toLowerCase();
  const v = String(value || '').trim().toLowerCase();
  switch (operator) {
    case 'equals':
      return s === v;
    case 'notEquals':
      return s !== v;
    case 'contains':
    default:
      return s.includes(v);
  }
}

async function sendFlowText(organizationId: string, conversationId: string, text: string): Promise<void> {
  if (!text.trim()) return;
  const { sendOutboundTextMessage } = await import('./inbox.service.js');
  await sendOutboundTextMessage(organizationId, conversationId, text);
}

// Sends real WhatsApp interactive reply buttons (max 3 — Meta's own limit)
// and persists the Message row directly, since sendOutboundTextMessage only
// supports plain text.
async function sendFlowButtons(
  organizationId: string,
  conversationId: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { contact: true } });
  if (!conversation) return;

  const usableButtons = buttons.slice(0, 3);
  if (usableButtons.length === 0) {
    await sendFlowText(organizationId, conversationId, bodyText);
    return;
  }

  const metaRes = await sendMetaOutboundMessage(organizationId, conversation.contact.phoneNumber, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: { buttons: usableButtons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title.slice(0, 20) } })) },
    },
  });

  await prisma.message.create({
    data: {
      organizationId,
      conversationId,
      wamid: metaRes.wamid,
      direction: 'OUTBOUND',
      type: 'INTERACTIVE',
      content: { text: bodyText, buttons: usableButtons },
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { lastMessageSnippet: bodyText.slice(0, 100), lastMessageAt: new Date() },
  });
}

// Same convention as webhook.worker.ts's round-robin: Managers/Agents first,
// Business Owner only as a last-resort fallback when there's no one else —
// never part of the regular rotation (see that file's fix for why).
async function roundRobinAssign(organizationId: string): Promise<string | null> {
  let members = await prisma.organizationMember.findMany({
    where: { organizationId, role: { in: ['MANAGER', 'AGENT'] }, isActive: true },
    select: { userId: true },
  });
  if (members.length === 0) {
    members = await prisma.organizationMember.findMany({
      where: { organizationId, role: 'BUSINESS_OWNER', isActive: true },
      select: { userId: true },
    });
  }
  if (members.length === 0) return null;

  const memberIds = members.map((m) => m.userId);
  const groupedCounts = await prisma.conversation.groupBy({
    by: ['assignedAgentId'],
    where: { organizationId, assignedAgentId: { in: memberIds }, status: 'OPEN' },
    _count: { id: true },
  });
  const countMap = new Map(memberIds.map((id) => [id, 0]));
  groupedCounts.forEach((g) => {
    if (g.assignedAgentId) countMap.set(g.assignedAgentId, g._count.id);
  });
  const openCounts = Array.from(countMap.entries()).map(([id, count]) => ({ id, count }));
  openCounts.sort((a, b) => a.count - b.count);
  return openCounts[0]?.id || null;
}

interface ExecResult {
  completed: boolean;
}

// Runs whatever a single node actually does (send a message, ask a
// question, assign a human, persist collected data, ...). Condition nodes
// are never passed here directly — they're resolved by the caller while
// walking edges, since they produce no message of their own.
async function executeNode(
  organizationId: string,
  conversationId: string,
  contactId: string,
  flowId: string,
  variables: Record<string, any>,
  node: FlowNode
): Promise<ExecResult> {
  const nodeType = getNodeType(node);

  switch (nodeType) {
    case 'message': {
      const text = node.data?.text ?? cleanLegacyLabel(String(node.data?.label || ''));
      await sendFlowText(organizationId, conversationId, text);
      return { completed: false };
    }

    case 'buttons': {
      const bodyText = node.data?.bodyText || cleanLegacyLabel(String(node.data?.label || '')) || 'Please choose an option:';
      const buttons = Array.isArray(node.data?.buttons) && node.data!.buttons!.length
        ? node.data!.buttons!
        : parseLegacyButtons(String(node.data?.label || ''));
      await sendFlowButtons(organizationId, conversationId, bodyText, buttons);
      return { completed: false };
    }

    case 'list': {
      const bodyText = node.data?.bodyText || 'Please choose an option:';
      const rows = (node.data?.listRows || []).slice(0, 10);
      if (rows.length === 0) {
        await sendFlowText(organizationId, conversationId, bodyText);
        return { completed: false };
      }
      const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, include: { contact: true } });
      if (conversation) {
        const metaRes = await sendMetaOutboundMessage(organizationId, conversation.contact.phoneNumber, {
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: bodyText },
            action: {
              button: (node.data?.listButtonLabel || 'View Options').slice(0, 20),
              sections: [{ title: 'Options', rows: rows.map((r) => ({ id: r.id, title: r.title.slice(0, 24), description: r.description?.slice(0, 72) })) }],
            },
          },
        });
        await prisma.message.create({
          data: {
            organizationId,
            conversationId,
            wamid: metaRes.wamid,
            direction: 'OUTBOUND',
            type: 'INTERACTIVE',
            content: { text: bodyText, listRows: rows },
            status: 'SENT',
            sentAt: new Date(),
          },
        });
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageSnippet: bodyText.slice(0, 100), lastMessageAt: new Date() },
        });
      }
      return { completed: false };
    }

    case 'collectInput': {
      const prompt = node.data?.promptText || '';
      if (prompt) await sendFlowText(organizationId, conversationId, prompt);
      return { completed: false };
    }

    case 'assignAgent': {
      const agentId = await roundRobinAssign(organizationId);
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          assignedAgentId: agentId,
          assignedAt: agentId ? new Date() : null,
          agentOpenedAt: null,
          status: agentId ? 'ESCALATED' : 'OPEN',
        },
      });
      if (agentId) {
        const { notifyAgentOfEscalation } = await import('./agent-notification.service.js');
        void notifyAgentOfEscalation(organizationId, agentId, conversationId);
      } else {
        // No one to hand off to — say something rather than silently going quiet.
        await sendFlowText(organizationId, conversationId, "Thanks — we've noted your request and someone will be in touch shortly.");
      }
      return { completed: true };
    }

    case 'saveData': {
      const fields = Array.isArray(node.data?.fields) ? node.data!.fields! : [];
      const updates: Record<string, any> = {};
      for (const f of fields) {
        if (f.variableName && f.attributeKey && variables[f.variableName] !== undefined) {
          updates[f.attributeKey] = variables[f.variableName];
        }
      }
      if (Object.keys(updates).length > 0) {
        const existingContact = await prisma.contact.findUnique({ where: { id: contactId }, select: { customAttributes: true } });
        await prisma.contact.update({
          where: { id: contactId },
          data: { customAttributes: { ...((existingContact?.customAttributes as object) || {}), ...updates } },
        });
      }
      await prisma.flowSubmission.create({
        data: { organizationId, flowId, contactId, conversationId, data: variables },
      });
      return { completed: false };
    }

    case 'end': {
      const text = node.data?.text || node.data?.label;
      if (text) await sendFlowText(organizationId, conversationId, text);
      return { completed: true };
    }

    default:
      return { completed: true };
  }
}

async function markSession(sessionId: string, status: 'COMPLETED' | 'ABANDONED' | 'EXPIRED', variables?: Record<string, any>): Promise<void> {
  await prisma.flowSession.update({
    where: { id: sessionId },
    data: { status, ...(variables ? { variables } : {}), lastAdvancedAt: new Date() },
  });
}

/**
 * Starts a brand-new Flow run for a conversation — follows the edge out of
 * the start node ('1') the same way the old single-hop dispatcher did, but
 * now persists a FlowSession so any later reply can keep advancing through
 * the rest of the graph instead of the flow silently ending after one message.
 */
export async function startFlowSession(
  organizationId: string,
  conversationId: string,
  contactId: string,
  flow: { id: string; definition: any }
): Promise<void> {
  const definition = (flow.definition || {}) as FlowDefinition;
  const nodes = definition.nodes || [];
  const edges = definition.edges || [];

  const firstEdge = edgeFrom(edges, '1');
  if (!firstEdge) {
    logger.warn({ flowId: flow.id }, 'Flow has no node connected to its start — nothing to run.');
    return;
  }
  const firstNode = nodes.find((n) => n.id === firstEdge.target);
  if (!firstNode) return;
  let targetNode: FlowNode = firstNode;

  const variables: Record<string, any> = {};

  // A Condition placed as the very first real step has nothing collected
  // yet to evaluate — walk its "false" branch (or "true" if that's all
  // there is) rather than refusing to start the flow at all.
  let guard = 0;
  while (getNodeType(targetNode) === 'condition' && guard++ < 20) {
    const branchEdge: FlowEdge | undefined =
      edgeFrom(edges, targetNode.id, 'false') || edgeFrom(edges, targetNode.id, 'true') || edgeFrom(edges, targetNode.id);
    if (!branchEdge) return;
    const nextTarget: FlowNode | undefined = nodes.find((n) => n.id === branchEdge.target);
    if (!nextTarget) return;
    targetNode = nextTarget;
  }

  const session = await prisma.flowSession.create({
    data: {
      organizationId,
      conversationId,
      flowId: flow.id,
      currentNodeId: targetNode.id,
      variables,
      status: 'ACTIVE',
      expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS),
    },
  });

  const result = await executeNode(organizationId, conversationId, contactId, flow.id, variables, targetNode);
  if (result.completed) {
    await markSession(session.id, 'COMPLETED', variables);
  }
}

/**
 * Advances an already-ACTIVE FlowSession using the customer's latest reply
 * (button tap, list selection, or free text). This is what makes a flow
 * genuinely multi-step: it resolves which outgoing edge the current node's
 * node type implies (a specific button, a condition branch, or the single
 * next step), executes whatever's on the other end, and either persists the
 * new position or marks the session finished.
 */
export async function advanceFlowSession(
  session: {
    id: string;
    organizationId: string;
    conversationId: string;
    flowId: string;
    currentNodeId: string;
    variables: any;
  },
  inbound: InboundFlowInput
): Promise<void> {
  const flow = await prisma.flow.findUnique({ where: { id: session.flowId } });
  if (!flow || !flow.isActive) {
    await markSession(session.id, 'ABANDONED');
    return;
  }

  const definition = (flow.definition || {}) as unknown as FlowDefinition;
  const nodes = definition.nodes || [];
  const edges = definition.edges || [];

  const currentNode = nodes.find((n) => n.id === session.currentNodeId);
  if (!currentNode) {
    await markSession(session.id, 'ABANDONED');
    return;
  }

  const currentType = getNodeType(currentNode);
  const variables: Record<string, any> = { ...(session.variables || {}) };
  let nextEdge: FlowEdge | undefined;

  if (currentType === 'buttons' || currentType === 'list') {
    const replyId = inbound.buttonReplyId || inbound.listReplyId;
    if (replyId) nextEdge = edgeFrom(edges, currentNode.id, replyId);

    if (!nextEdge) {
      // Customer typed the option instead of tapping it — match by title.
      const options: { id: string; title: string }[] =
        currentType === 'buttons'
          ? (Array.isArray(currentNode.data?.buttons) && currentNode.data!.buttons!.length ? currentNode.data!.buttons! : parseLegacyButtons(String(currentNode.data?.label || '')))
          : (currentNode.data?.listRows || []);
      const typed = inbound.text.trim().toLowerCase();
      const match = options.find((o) => o.title.trim().toLowerCase() === typed);
      if (match) nextEdge = edgeFrom(edges, currentNode.id, match.id);
    }

    if (!nextEdge) {
      // No per-option edge at all (a legacy flow that never recorded one, or
      // a builder mistake) — fall back to whichever edge leaves this node
      // rather than getting the conversation permanently stuck.
      nextEdge = edges.find((e) => e.source === currentNode.id);
    }

    if (!nextEdge) {
      await sendFlowText(session.organizationId, session.conversationId, "Sorry, I didn't quite get that — please tap one of the options above.");
      await prisma.flowSession.update({
        where: { id: session.id },
        data: { lastAdvancedAt: new Date(), expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS) },
      });
      return;
    }
  } else if (currentType === 'collectInput') {
    const varName = currentNode.data?.variableName;
    if (varName) variables[varName] = inbound.text;
    nextEdge = edgeFrom(edges, currentNode.id);
  } else {
    // Plain message (or any other non-branching node) — one way forward.
    nextEdge = edgeFrom(edges, currentNode.id);
  }

  if (!nextEdge) {
    await markSession(session.id, 'COMPLETED', variables);
    return;
  }

  const firstTargetNode = nodes.find((n) => n.id === nextEdge!.target);
  if (!firstTargetNode) {
    await markSession(session.id, 'COMPLETED', variables);
    return;
  }
  let targetNode: FlowNode = firstTargetNode;

  // Condition nodes resolve silently (no message of their own) against
  // either a named collected variable or, if none is configured, the
  // customer's latest raw reply — then continue into whichever branch matched.
  let guard = 0;
  while (getNodeType(targetNode) === 'condition' && guard++ < 20) {
    const cond = targetNode.data || {};
    const subject = cond.variable && variables[cond.variable] !== undefined ? String(variables[cond.variable]) : inbound.text;
    const matched = evaluateCondition(subject, cond.operator, cond.value);
    const branchEdge: FlowEdge | undefined = edgeFrom(edges, targetNode.id, matched ? 'true' : 'false') || edgeFrom(edges, targetNode.id);
    if (!branchEdge) {
      await markSession(session.id, 'COMPLETED', variables);
      return;
    }
    const nextTarget: FlowNode | undefined = nodes.find((n) => n.id === branchEdge.target);
    if (!nextTarget) {
      await markSession(session.id, 'COMPLETED', variables);
      return;
    }
    targetNode = nextTarget;
  }

  const contactRow = await prisma.conversation.findUnique({ where: { id: session.conversationId }, select: { contactId: true } });
  if (!contactRow) {
    await markSession(session.id, 'ABANDONED', variables);
    return;
  }

  const result = await executeNode(session.organizationId, session.conversationId, contactRow.contactId, session.flowId, variables, targetNode);

  if (result.completed) {
    await markSession(session.id, 'COMPLETED', variables);
  } else {
    await prisma.flowSession.update({
      where: { id: session.id },
      data: {
        currentNodeId: targetNode.id,
        variables,
        lastAdvancedAt: new Date(),
        expiresAt: new Date(Date.now() + SESSION_TIMEOUT_MS),
      },
    });
  }
}

/** The single ACTIVE session for a conversation, if any — null once completed/expired/abandoned. */
export async function getActiveFlowSession(conversationId: string) {
  return prisma.flowSession.findFirst({
    where: { conversationId, status: 'ACTIVE' },
    orderBy: { startedAt: 'desc' },
  });
}

/**
 * Periodic sweep (mirrors disappearing-messages.worker.ts's pattern) —
 * expires ACTIVE sessions nobody replied to in time, so an abandoned
 * mid-flow conversation falls back to normal AI/keyword-bot handling
 * instead of staying permanently stuck waiting for a reply that never comes.
 */
export async function expireStaleFlowSessions(): Promise<number> {
  const result = await prisma.flowSession.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });
  return result.count;
}
