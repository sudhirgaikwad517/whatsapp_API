import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { cleanPhone } from './contact.service.js';

export async function createLead(input: {
  name: string;
  email: string;
  phoneNumber: string;
  isReceivingWhatsapp?: boolean | null;
  message?: string;
}) {
  if (!input.name?.trim() || !input.email?.trim() || !input.phoneNumber?.trim()) {
    throw new AppError('Name, email, and phone number are required.', 400, 'MISSING_FIELDS');
  }

  return prisma.lead.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phoneNumber: cleanPhone(input.phoneNumber),
      isReceivingWhatsapp: input.isReceivingWhatsapp ?? null,
      message: input.message?.trim() || null,
    },
  });
}

export async function listLeads() {
  return prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
}
