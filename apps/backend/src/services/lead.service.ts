import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { cleanPhone } from './contact.service.js';

export async function createLead(input: {
  name: string;
  email: string;
  phoneNumber: string;
  isReceivingWhatsapp?: boolean | null;
  message?: string;
  source?: string;
}) {
  if (!input.name?.trim() || !input.email?.trim()) {
    throw new AppError('Name and email are required.', 400, 'MISSING_FIELDS');
  }

  return prisma.lead.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phoneNumber: input.phoneNumber?.trim() ? cleanPhone(input.phoneNumber) : null,
      isReceivingWhatsapp: input.isReceivingWhatsapp ?? null,
      message: input.message?.trim() || null,
      source: input.source?.trim() || 'popup',
    },
  });
}

export async function listLeads() {
  return prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
}
