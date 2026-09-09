import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendMail, buildChatAssignedEmail } from '../utils/mailer.js';

/**
 * Notifies a human agent that the AI Copilot handed a conversation off to
 * them — by email always, and by WhatsApp template message if the org has
 * both configured an approved escalation template and recorded a phone
 * number for this agent. The WhatsApp send is billed against the SAME
 * org's own wallet, at the standard utility-message rate, since it goes
 * out through that org's own WhatsApp Business number.
 */
export async function notifyAgentOfEscalation(
  organizationId: string,
  agentUserId: string,
  conversationId: string
): Promise<void> {
  try {
    const [agent, org, conversation] = await Promise.all([
      prisma.user.findUnique({ where: { id: agentUserId }, select: { fullName: true, email: true, phoneNumber: true } }),
      prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true, escalationTemplateId: true } }),
      prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { contact: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    if (!agent) return;

    const contactName =
      [conversation?.contact?.firstName, conversation?.contact?.lastName].filter(Boolean).join(' ').trim() || 'a customer';

    try {
      await sendMail({
        to: agent.email,
        subject: `New Chat Assigned — ${contactName}`,
        html: buildChatAssignedEmail(agent.fullName, contactName, org?.name || 'Prowexa', `${env.ADMIN_PANEL_URL.replace(/\/$/, '')}/login`),
      });
    } catch (err) {
      logger.error({ organizationId, agentUserId, err }, 'Failed to email agent about chat assignment.');
    }

    if (!org?.escalationTemplateId || !agent.phoneNumber) return;

    const template = await prisma.template.findUnique({ where: { id: org.escalationTemplateId } });
    if (!template || template.status !== 'APPROVED') {
      logger.warn({ organizationId, templateId: org.escalationTemplateId }, 'Configured escalation template is missing or not approved — skipping WhatsApp notification.');
      return;
    }

    const bodyComponent = Array.isArray(template.components)
      ? (template.components as any[]).find((c) => c?.type === 'BODY')
      : null;
    const varCount = bodyComponent?.text ? new Set(bodyComponent.text.match(/\{\{\d+\}\}/g) || []).size : 0;
    const paramValues = [agent.fullName, contactName].slice(0, varCount);
    const templateComponents =
      varCount > 0 ? [{ type: 'body', parameters: paramValues.map((text) => ({ type: 'text', text })) }] : [];

    const { sendMetaOutboundMessage } = await import('./meta-whatsapp.service.js');
    const metaRes = await sendMetaOutboundMessage(organizationId, agent.phoneNumber, {
      type: 'template',
      template: {
        name: template.name,
        language: { code: template.language },
        components: templateComponents.length ? templateComponents : undefined,
      },
    });

    // Persist this the same way every other outbound template send is
    // persisted — a real Message row, not the hand-rolled wallet debit this
    // used to do instead. getTemplateSentCounts (the single source of truth
    // for both an org's own Utility Messages count and SuperAdmin's
    // platform-wide telemetry) counts Message rows directly; a manual
    // deductDirectWalletBalance call bypassed that entirely, so this send
    // genuinely cost the org money but was invisible in every Utility
    // Messages count anywhere in the product. Message-row billing also gets
    // the standard reconcileUnbilledUsage pipeline's free-vs-24h-window
    // determination for free, instead of the hand-rolled version of that
    // check this used to duplicate here.
    const waAccount = await prisma.whatsappAccount.findFirst({
      where: { organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!waAccount) {
      logger.warn({ organizationId, agentUserId }, 'No connected WhatsApp account — cannot record escalation notification message.');
      return;
    }

    let agentContact = await prisma.contact.findFirst({
      where: { organizationId, phoneNumber: agent.phoneNumber, deletedAt: null },
      select: { id: true },
    });
    if (!agentContact) {
      agentContact = await prisma.contact.create({
        data: { organizationId, phoneNumber: agent.phoneNumber, firstName: agent.fullName },
        select: { id: true },
      });
    }

    const agentConversation = await prisma.conversation.upsert({
      where: { whatsappAccountId_contactId: { whatsappAccountId: waAccount.id, contactId: agentContact.id } },
      update: {},
      create: { organizationId, whatsappAccountId: waAccount.id, contactId: agentContact.id, status: 'OPEN' },
      select: { id: true },
    });

    await prisma.message.create({
      data: {
        organizationId,
        conversationId: agentConversation.id,
        wamid: metaRes.wamid,
        direction: 'OUTBOUND',
        type: 'TEMPLATE',
        content: { templateName: template.name, components: templateComponents, templateCategory: template.category },
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    await prisma.conversation.update({
      where: { id: agentConversation.id },
      data: {
        lastMessageSnippet: `[Template: ${template.name}]`,
        lastMessageAt: new Date(),
        windowExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    logger.info({ organizationId, agentUserId, conversationId }, 'Agent notified of chat assignment via WhatsApp.');
  } catch (err) {
    logger.error({ organizationId, agentUserId, conversationId, err }, 'Failed to notify agent of chat escalation.');
  }
}
