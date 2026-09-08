import { prisma } from '../config/database.js';
import { ConversationStatus } from '@prisma/client';
import { sendMetaOutboundMessage } from './meta-whatsapp.service.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { env } from '../config/env.js';

export interface Requester {
  id: string;
  role: string;
}

/**
 * A plain AGENT may only view/act on a conversation that's either unclaimed
 * (assignedAgentId null — first responder claims it) or already assigned to
 * them. BUSINESS_OWNER and MANAGER always have full access, since they're
 * meant to oversee/reassign every conversation.
 */
function assertConversationAccess(conversation: { assignedAgentId: string | null }, requester: Requester) {
  if (requester.role === 'BUSINESS_OWNER' || requester.role === 'MANAGER') return;
  if (conversation.assignedAgentId && conversation.assignedAgentId !== requester.id) {
    throw new AppError('This chat is assigned to another agent.', 403, 'CONVERSATION_ASSIGNED_TO_OTHER');
  }
}

/**
 * A human agent replying to an unclaimed chat claims it — this both stops the
 * AI from replying to it again (ai.service.ts backs off once assignedAgentId
 * is set) and gives that agent exclusive ownership of it. Uses a conditional
 * updateMany (not update-by-id) so the claim is atomic: if two agents reply
 * to the same unassigned chat in the same instant, only the first commits.
 */
async function claimConversationIfUnassigned(conversationId: string, actingAgent?: Requester): Promise<void> {
  if (!actingAgent) return;
  // Setting assignedAgentId alone is enough — webhook.worker.ts's AI-routing
  // logic now preserves any already-assigned conversation regardless of its
  // status label (previously it only preserved status === 'ESCALATED', which
  // this function had to fake-set here purely to keep AI from reclaiming a
  // plain human claim, and that leaked into the Inbox UI showing "Escalated
  // to Live Agent" on every ordinary agent-initiated send — including things
  // like sending a catalog product, not just a real AI handoff).
  await prisma.conversation.updateMany({
    where: { id: conversationId, assignedAgentId: null },
    data: { assignedAgentId: actingAgent.id, assignedAt: new Date(), agentOpenedAt: new Date() },
  });
}

export async function listConversations(
  organizationId: string,
  options: { status?: string; assignedAgentId?: string; contactId?: string; search?: string; page?: number; limit?: number },
  requester?: Requester
) {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const skip = (page - 1) * limit;

  const activeAccount = await prisma.whatsappAccount.findFirst({
    where: { organizationId, deletedAt: null },
  });

  if (options.contactId && activeAccount) {
    try {
      await prisma.conversation.upsert({
        where: {
          whatsappAccountId_contactId: {
            whatsappAccountId: activeAccount.id,
            contactId: options.contactId,
          },
        },
        update: {},
        create: {
          organizationId,
          whatsappAccountId: activeAccount.id,
          contactId: options.contactId,
          status: 'OPEN',
        },
      });
    } catch {
      // Ignore conflict
    }
  }

  if (activeAccount) {
    // Background sync of contacts is now handled asynchronously when webhooks arrive,
    // avoiding massive N+1 database spikes on every inbox refresh.
  }

  const where: any = { organizationId };
  if (options.status) where.status = options.status;
  if (options.assignedAgentId) where.assignedAgentId = options.assignedAgentId;
  // A plain AGENT only ever sees their own assigned conversations — this
  // overrides any assignedAgentId the client tries to pass, so an agent
  // can't peek at another agent's chats by editing the request.
  if (requester?.role === 'AGENT') where.assignedAgentId = requester.id;

  if (options.search && options.search.trim()) {
    const s = options.search.trim();
    where.contact = {
      OR: [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s } },
      ],
    };
  }

  const [total, conversations] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      skip,
      take: limit,
      include: {
        contact: true,
        assignedAgent: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    }),
  ]);

  return { conversations, total, page, limit };
}

export async function getConversationMessages(
  conversationId: string,
  organizationId: string,
  requester?: Requester,
  options: { before?: Date; after?: Date; limit?: number } = {}
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: {
      contact: true,
      assignedAgent: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
  if (requester) assertConversationAccess(conversation, requester);

  // Only the initial (uncursored) load counts as "opening" the conversation —
  // neither "load older messages" (before) nor the live-poll incremental
  // sync (after, see below) should re-stamp agentOpenedAt or re-mark it read.
  if (!options.before && !options.after) {
    const isFirstOpenByAssignedAgent =
      requester?.role === 'AGENT' && conversation.assignedAgentId === requester.id && !conversation.agentOpenedAt;

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        unreadCount: 0,
        ...(isFirstOpenByAssignedAgent ? { agentOpenedAt: new Date() } : {}),
      },
    });
  }

  // `after` powers incremental polling: the frontend re-requests only
  // messages newer than the latest one it already has and merges them in,
  // rather than re-fetching "the latest N" from scratch every 3s — a fixed
  // "latest N" window quietly slides forward as new messages arrive, and a
  // page that had already paginated back into older history would lose
  // whatever fell out of that window with no way to recover it without
  // reopening the conversation. Ascending order, no take-side pagination
  // (this range is only ever "since the last poll", so it's never large).
  if (options.after) {
    const newMessages = await prisma.message.findMany({
      where: { conversationId, createdAt: { gt: options.after } },
      orderBy: { createdAt: 'asc' },
      take: 500,
    });
    return { conversation, messages: newMessages, hasMore: false };
  }

  // A conversation with a long-running history returned every message on
  // every open with no limit at all — paginate to the most recent N,
  // fetching one extra row to know whether older messages still exist
  // without a separate count query.
  const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 200) : 50;
  const rows = await prisma.message.findMany({
    where: { conversationId, ...(options.before ? { createdAt: { lt: options.before } } : {}) },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const messages = rows.slice(0, limit).reverse();

  return { conversation, messages, hasMore };
}

export async function sendOutboundTextMessage(
  organizationId: string,
  conversationId: string,
  text: string,
  actingAgent?: Requester
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: { contact: true },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
  if (actingAgent) assertConversationAccess(conversation, actingAgent);

  // Check 24-hour service window expiry for free-form customer text messages (enforced in production)
  if (env.NODE_ENV === 'production' && conversation.windowExpiresAt && conversation.windowExpiresAt < new Date()) {
    throw new AppError(
      'The 24-hour customer service window has expired. You must use an approved WhatsApp Template message to re-engage this contact.',
      400,
      'SERVICE_WINDOW_EXPIRED'
    );
  }

  // Send via Meta Graph API
  const metaRes = await sendMetaOutboundMessage(organizationId, conversation.contact.phoneNumber, {
    type: 'text',
    text,
  });

  // Save to database
  const message = await prisma.message.create({
    data: {
      organizationId,
      conversationId,
      wamid: metaRes.wamid,
      direction: 'OUTBOUND',
      type: 'TEXT',
      content: { text },
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  // Update conversation last snippet, 24h window expiry, and first response time (FRT)
  const extendedWindow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const frtMs = (!(conversation as any).firstResponseTimeMs && conversation.createdAt)
    ? Math.max(0, Date.now() - new Date(conversation.createdAt).getTime())
    : undefined;

  await claimConversationIfUnassigned(conversationId, actingAgent);

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageSnippet: text.slice(0, 100),
      lastMessageAt: new Date(),
      windowExpiresAt: extendedWindow,
      ...(frtMs !== undefined ? { firstResponseTimeMs: frtMs } : {}),
    },
  });

  return message;
}

export async function assignConversation(
  organizationId: string,
  conversationId: string,
  agentId: string | null,
  requester?: Requester
) {
  if (requester && requester.role !== 'BUSINESS_OWNER' && requester.role !== 'MANAGER') {
    throw new AppError('Only the org owner or a manager can assign conversations.', 403, 'FORBIDDEN');
  }
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      assignedAgentId: agentId,
      // Reset the SLA clock for the newly-assigned agent; clear it entirely
      // when unassigning.
      assignedAt: agentId ? new Date() : null,
      agentOpenedAt: null,
      ...(agentId === null && conversation.status === 'ESCALATED' ? { status: 'OPEN' } : {}),
    },
    include: { assignedAgent: { select: { id: true, fullName: true, email: true } } },
  });

  return updated;
}

export async function updateConversationStatus(
  organizationId: string,
  conversationId: string,
  status: string,
  requester?: Requester
) {
  if (!Object.values(ConversationStatus).includes(status as ConversationStatus)) {
    throw new AppError(
      `Invalid conversation status "${status}". Must be one of: ${Object.values(ConversationStatus).join(', ')}.`,
      400,
      'INVALID_STATUS'
    );
  }
  const validatedStatus = status as ConversationStatus;

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
  if (requester) assertConversationAccess(conversation, requester);

  const isResolved = validatedStatus === 'CLOSED' || validatedStatus === 'RESOLVED';

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: validatedStatus,
      // Keep assignedAgentId intact on resolve — every round-robin/open-chat
      // count query already scopes by status:'OPEN', so clearing it here
      // served no purpose except erasing which agent resolved the chat,
      // which broke the analytics leaderboard's per-agent resolved count.
      ...(isResolved ? { resolvedAt: new Date() } : {}),
    },
  });

  try {
    const { emitToOrganization } = await import('../socket/inbox.gateway.js');
    emitToOrganization(organizationId, 'new_message', { conversationId });
  } catch (err) {
    // Ignore socket error
  }

  return updated;
}

export async function addInternalNote(
  organizationId: string,
  conversationId: string,
  authorId: string,
  content: string,
  requester?: Requester
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
  if (requester) assertConversationAccess(conversation, requester);

  const note = await prisma.internalNote.create({
    data: {
      conversationId,
      authorId,
      content,
    },
    include: { author: { select: { id: true, fullName: true, email: true } } },
  });

  return note;
}

export async function getInternalNotes(conversationId: string, organizationId: string, requester?: Requester) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
  if (requester) assertConversationAccess(conversation, requester);

  return prisma.internalNote.findMany({
    where: { conversationId },
    include: {
      author: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function sendOutboundTemplateMessage(
  organizationId: string,
  conversationId: string,
  templateName: string,
  language: string = 'en_US',
  components: any[] = [],
  actingAgent?: Requester
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: { contact: true },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
  if (actingAgent) assertConversationAccess(conversation, actingAgent);

  // Send via Meta Graph API
  const templatePayload = {
    name: templateName,
    language: { code: language },
    components: components.length ? components : undefined,
  };

  const metaRes = await sendMetaOutboundMessage(organizationId, conversation.contact.phoneNumber, {
    type: 'template',
    template: templatePayload,
  });

  // Snapshot the template's category at send time, scoped to the exact WABA
  // + language this message actually used — usage-metrics.service.ts's
  // billing/telemetry count reads this first (falling back to a live
  // Template join only for older messages sent before this existed), which
  // avoids two real bugs: double-counting when an org has a same-named
  // template on more than one WhatsApp number or in more than one language,
  // and a template's category being reassigned by Meta later silently
  // rewriting the price of every historical message ever sent under that name.
  const templateRow = await prisma.template.findFirst({
    where: { whatsappAccountId: conversation.whatsappAccountId, name: templateName, language },
    select: { category: true },
  });

  // Save to database
  const message = await prisma.message.create({
    data: {
      organizationId,
      conversationId,
      wamid: metaRes.wamid,
      direction: 'OUTBOUND',
      type: 'TEMPLATE',
      content: { templateName, components, templateCategory: templateRow?.category || null },
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  // Update conversation last snippet & extend window expiry by 24h
  const extendedWindow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await claimConversationIfUnassigned(conversationId, actingAgent);
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageSnippet: `[Template: ${templateName}]`,
      lastMessageAt: new Date(),
      windowExpiresAt: extendedWindow,
    },
  });

  return message;
}

export async function sendOutboundMediaMessage(
  organizationId: string,
  conversationId: string,
  mediaPayload: { type: 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO'; mediaUrl: string; filename?: string; caption?: string },
  actingAgent?: Requester
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: { contact: true },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');
  if (actingAgent) assertConversationAccess(conversation, actingAgent);

  // Same 24-hour service window check sendOutboundTextMessage already has —
  // a raw media/image message (e.g. sending a catalog product) is a
  // free-form message just like text, and Meta rejects it the same way
  // outside an open window. Without this the agent got no warning at all:
  // the initial API call could still return 200 with a wamid, and the
  // message only showed as failed later via an async delivery-status
  // webhook — easy to miss, and by then the agent had already moved on
  // thinking it was sent.
  if (env.NODE_ENV === 'production' && conversation.windowExpiresAt && conversation.windowExpiresAt < new Date()) {
    throw new AppError(
      'The 24-hour customer service window has expired. You must use an approved WhatsApp Template message to re-engage this contact.',
      400,
      'SERVICE_WINDOW_EXPIRED'
    );
  }

  // Actually dispatch via the Meta Graph API — this previously just wrote a
  // Message row with a fabricated wamid and never sent anything to WhatsApp.
  const metaRes = await sendMetaOutboundMessage(organizationId, conversation.contact.phoneNumber, {
    type: mediaPayload.type.toLowerCase() as 'image' | 'document' | 'audio' | 'video',
    mediaUrl: mediaPayload.mediaUrl,
    filename: mediaPayload.filename,
    caption: mediaPayload.caption,
  });

  const extendedWindow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const message = await prisma.message.create({
    data: {
      organizationId,
      conversationId,
      wamid: metaRes.wamid,
      direction: 'OUTBOUND',
      type: mediaPayload.type,
      content: {
        mediaUrl: mediaPayload.mediaUrl,
        filename: mediaPayload.filename,
        caption: mediaPayload.caption,
      },
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  await claimConversationIfUnassigned(conversationId, actingAgent);
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageSnippet: `[${mediaPayload.type}] ${mediaPayload.filename || ''}`.trim(),
      lastMessageAt: new Date(),
      windowExpiresAt: extendedWindow,
    },
  });

  return message;
}

