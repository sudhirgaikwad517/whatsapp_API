import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { cleanPhone } from './contact.service.js';

export async function createLead(input: {
  name: string;
  email: string;
  phoneNumber?: string;
  whatsappConsent?: boolean | null;
  message?: string;
  company?: string;
  industry?: string;
  messageVolume?: string;
  source?: string;
}) {
  if (!input.name?.trim() || !input.email?.trim()) {
    throw new AppError('Name and email are required.', 400, 'MISSING_FIELDS');
  }

  const lead = await prisma.lead.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phoneNumber: input.phoneNumber?.trim() ? cleanPhone(input.phoneNumber) : null,
      whatsappConsent: input.whatsappConsent ?? null,
      message: input.message?.trim() || null,
      company: input.company?.trim() || null,
      industry: input.industry?.trim() || null,
      messageVolume: input.messageVolume?.trim() || null,
      source: input.source?.trim() || 'popup',
    },
  });

  try {
    const { sendMail, buildLeadReceivedEmail, buildNewLeadNotificationEmail } = await import('../utils/mailer.js');

    await sendMail({
      to: lead.email,
      subject: 'We received your message — Wabtic',
      html: buildLeadReceivedEmail({ name: lead.name, source: lead.source }),
    });

    await sendMail({
      to: env.SALES_NOTIFICATION_EMAIL,
      subject: `New Website Lead — ${lead.name}`,
      html: buildNewLeadNotificationEmail({
        name: lead.name,
        email: lead.email,
        phoneNumber: lead.phoneNumber,
        source: lead.source,
        whatsappConsent: lead.whatsappConsent,
        company: lead.company,
        industry: lead.industry,
        messageVolume: lead.messageVolume,
        message: lead.message,
      }),
    });
  } catch (err) {
    logger.error({ leadId: lead.id, err }, 'Failed to send lead notification emails.');
  }

  return lead;
}

export async function listLeads() {
  return prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
}
