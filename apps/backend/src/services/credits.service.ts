import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';

export async function deductAiCredit(organizationId: string, source: string = 'AI_COPILOT'): Promise<number> {
  const org = await (prisma as any).organization.findUnique({
    where: { id: organizationId },
    select: { aiCreditsBalance: true, name: true },
  });

  if (!org) {
    throw new AppError('Organization not found', 404, 'ORG_NOT_FOUND');
  }

  const currentBalance = org.aiCreditsBalance ?? 0;

  if (currentBalance <= 0) {
    throw new AppError(
      'Insufficient AI Credits. Please top up your Prowexa Credit Bundle in Settings or Billing.',
      402,
      'INSUFFICIENT_AI_CREDITS'
    );
  }

  const updated = await (prisma as any).organization.update({
    where: { id: organizationId },
    data: {
      aiCreditsBalance: { decrement: 1 },
    },
    select: { aiCreditsBalance: true },
  });

  return updated.aiCreditsBalance;
}

export async function addAiCredits(organizationId: string, creditsAmount: number): Promise<number> {
  const updated = await (prisma as any).organization.update({
    where: { id: organizationId },
    data: {
      aiCreditsBalance: { increment: creditsAmount },
    },
    select: { aiCreditsBalance: true },
  });

  return updated.aiCreditsBalance;
}

export async function getAiCreditsBalance(organizationId: string) {
  const org = await (prisma as any).organization.findUnique({
    where: { id: organizationId },
    select: { aiCreditsBalance: true, planTier: true },
  });

  return {
    aiCreditsBalance: org?.aiCreditsBalance ?? 0,
    planTier: org?.planTier ?? 'PRO',
  };
}
