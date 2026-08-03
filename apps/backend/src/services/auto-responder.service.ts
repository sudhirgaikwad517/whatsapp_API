import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { logger } from '../utils/logger.js';

export async function getOrganizationRules(organizationId: string) {
  return prisma.autoResponderRule.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createRule(
  organizationId: string,
  data: { name: string; keywords: string[]; replyMessage: string; matchType?: string }
) {
  const normalizedKeywords = data.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);

  return prisma.autoResponderRule.create({
    data: {
      organizationId,
      name: data.name,
      keywords: normalizedKeywords,
      replyMessage: data.replyMessage,
      matchType: data.matchType || 'CONTAINS',
    },
  });
}

export async function updateRule(
  organizationId: string,
  ruleId: string,
  data: { name?: string; keywords?: string[]; replyMessage?: string; isActive?: boolean }
) {
  const rule = await prisma.autoResponderRule.findFirst({
    where: { id: ruleId, organizationId },
  });

  if (!rule) {
    throw new AppError('Auto-responder rule not found.', 404, 'RULE_NOT_FOUND');
  }

  const updateData: any = {};
  if (data.name) updateData.name = data.name;
  if (data.keywords) updateData.keywords = data.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  if (data.replyMessage) updateData.replyMessage = data.replyMessage;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return prisma.autoResponderRule.update({
    where: { id: ruleId },
    data: updateData,
  });
}

export async function deleteRule(organizationId: string, ruleId: string) {
  const rule = await prisma.autoResponderRule.findFirst({
    where: { id: ruleId, organizationId },
  });

  if (!rule) {
    throw new AppError('Auto-responder rule not found.', 404, 'RULE_NOT_FOUND');
  }

  return prisma.autoResponderRule.delete({
    where: { id: ruleId },
  });
}

/**
 * Intelligent Keyword Matcher for Webhook Worker
 * Matches inbound text like "Hi", "Hiii", "HIIII", "hello", "Hello!" against tenant rules.
 */
export async function findMatchingAutoReply(organizationId: string, inboundText: string): Promise<string | null> {
  const rules = await prisma.autoResponderRule.findMany({
    where: { organizationId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (rules.length === 0) {
    return null;
  }

  const cleanedText = inboundText.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      const cleanKeyword = keyword.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!cleanKeyword) continue;

      // 1. Direct contains or exact match
      if (cleanedText === cleanKeyword || cleanedText.includes(cleanKeyword)) {
        return rule.replyMessage;
      }

      // 2. Flexible repeated character match (e.g., "hiii", "hiiii" -> matches keyword "hi")
      const regexPattern = new RegExp(`^${cleanKeyword.replace(/(.)\1*/g, '$1+')}$`, 'i');
      if (regexPattern.test(cleanedText)) {
        return rule.replyMessage;
      }
    }
  }

  return null;
}
