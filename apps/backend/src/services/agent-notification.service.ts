import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { sendMail, buildChatAssignedEmail } from '../utils/mailer.js';

const ESCALATION_WHATSAPP_COST_INR = 0.2; // Same per-message utility rate used elsewhere in billing.

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
    await sendMetaOutboundMessage(organizationId, agent.phoneNumber, {
      type: 'template',
      template: {
        name: template.name,
        language: { code: template.language },
        components: templateComponents.length ? templateComponents : undefined,
      },
    });

    const { deductDirectWalletBalance } = await import('./billing-wallet.service.js');
    await deductDirectWalletBalance(
      organizationId,
      ESCALATION_WHATSAPP_COST_INR,
      `escalation_${conversationId}_${Date.now()}`,
      `WhatsApp notification: chat assigned (${template.name})`
    );

    logger.info({ organizationId, agentUserId, conversationId }, 'Agent notified of chat assignment via WhatsApp.');
  } catch (err) {
    logger.error({ organizationId, agentUserId, conversationId, err }, 'Failed to notify agent of chat escalation.');
  }
}
