import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';

export interface CreateCannedResponseInput {
  shortcut: string;
  title: string;
  message: string;
}

export async function listCannedResponses(organizationId: string) {
  return (prisma as any).cannedResponse.findMany({
    where: { organizationId },
    orderBy: { shortcut: 'asc' },
  });
}

export async function createCannedResponse(organizationId: string, input: CreateCannedResponseInput) {
  const cleanShortcut = input.shortcut.trim().toLowerCase().replace(/^\/+/, '');
  if (!cleanShortcut) {
    throw new AppError('Shortcut string is required (e.g. "pricing" or "hello").', 400, 'INVALID_SHORTCUT');
  }
  if (!input.title.trim()) {
    throw new AppError('Title is required for canned response.', 400, 'INVALID_TITLE');
  }
  if (!input.message.trim()) {
    throw new AppError('Message body cannot be empty.', 400, 'INVALID_MESSAGE');
  }

  const existing = await (prisma as any).cannedResponse.findUnique({
    where: {
      organizationId_shortcut: {
        organizationId,
        shortcut: cleanShortcut,
      },
    },
  });

  if (existing) {
    throw new AppError(`A canned response with shortcut "/${cleanShortcut}" already exists.`, 400, 'DUPLICATE_SHORTCUT');
  }

  return (prisma as any).cannedResponse.create({
    data: {
      organizationId,
      shortcut: cleanShortcut,
      title: input.title.trim(),
      message: input.message.trim(),
    },
  });
}

export async function deleteCannedResponse(organizationId: string, id: string) {
  const item = await (prisma as any).cannedResponse.findFirst({
    where: { id, organizationId },
  });

  if (!item) {
    throw new AppError('Canned response snippet not found.', 404, 'NOT_FOUND');
  }

  await (prisma as any).cannedResponse.delete({
    where: { id },
  });

  return { success: true };
}
