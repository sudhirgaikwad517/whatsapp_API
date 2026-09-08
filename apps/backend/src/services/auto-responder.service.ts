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

// Splits into lowercased words, punctuation treated as a separator (not
// stripped to nothing) — used for multi-word keyword matching so word
// boundaries survive normalization.
function normalizeWords(text: string): string[] {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Common real-world spellings/variants of a greeting all resolve to the same
// canonical word. Runs AFTER repeated-character collapsing ("heyyy" -> "hey")
// so both cases share one lookup. Anything not a recognized greeting is
// returned unchanged (lowercased, NOT collapsed) so this can never rewrite an
// unrelated keyword like "book"/"order" into something it isn't.
const GREETING_CANONICAL_MAP: Record<string, string> = {
  hi: 'hi', hey: 'hi', hie: 'hi', hii: 'hi', heya: 'hi', hiya: 'hi',
  helo: 'hi', hello: 'hi', hallo: 'hi', hola: 'hi', hai: 'hi', yo: 'hi',
  namaste: 'hi', namaskar: 'hi',
};

export function canonicalizeGreeting(word: string): string {
  const lower = word.trim().toLowerCase();
  const collapsed = lower.replace(/(.)\1+/g, '$1');
  return GREETING_CANONICAL_MAP[collapsed] || GREETING_CANONICAL_MAP[lower] || lower;
}

// True only when `word` is itself a recognized greeting spelling — used to
// gate the fuzzy-greeting check so it never fires for a non-greeting keyword
// (canonicalizeGreeting() alone can't distinguish "already canonical" from
// "not a greeting at all", since both return the input unchanged). Exported
// for flow.service.ts's evaluateInboundFlow, which needs the same gate.
export function isKnownGreeting(word: string): boolean {
  const lower = word.trim().toLowerCase();
  const collapsed = lower.replace(/(.)\1+/g, '$1');
  return Boolean(GREETING_CANONICAL_MAP[collapsed] || GREETING_CANONICAL_MAP[lower]);
}

// True if keywordWords appears as a contiguous run inside textWords.
function containsWordSequence(textWords: string[], keywordWords: string[]): boolean {
  if (keywordWords.length === 0 || keywordWords.length > textWords.length) return false;
  for (let i = 0; i <= textWords.length - keywordWords.length; i++) {
    let match = true;
    for (let j = 0; j < keywordWords.length; j++) {
      if (textWords[i + j] !== keywordWords[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
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

  // All-spaces-stripped form, kept for single-word keyword matching (loose
  // substring matching is intentional there, e.g. keyword "help" matching
  // inside "helpful").
  const cleanedText = inboundText.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const textWords = normalizeWords(inboundText);

  for (const rule of rules) {
    for (const keyword of rule.keywords) {
      const keywordWords = normalizeWords(keyword);
      if (keywordWords.length === 0) continue;

      if (keywordWords.length > 1) {
        // Multi-word keyword: require its words to appear as a contiguous,
        // word-boundary-respecting sequence in the message — stripping all
        // spaces before matching (the old approach) collapsed word
        // boundaries and could match unrelated text, e.g. keyword "help me"
        // (stripped to "helpme") false-matched "...help meeting..." because
        // "helpme" is a contiguous substring of "helpmeeting".
        if (containsWordSequence(textWords, keywordWords)) {
          return rule.replyMessage;
        }
        continue;
      }

      const cleanKeyword = keywordWords[0];

      // 1. Direct contains or exact match
      if (cleanedText === cleanKeyword || cleanedText.includes(cleanKeyword)) {
        return rule.replyMessage;
      }

      // 2. Flexible repeated character match (e.g., "hiii", "hiiii" -> matches keyword "hi")
      const regexPattern = new RegExp(`^${cleanKeyword.replace(/(.)\1*/g, '$1+')}$`, 'i');
      if (regexPattern.test(cleanedText)) {
        return rule.replyMessage;
      }

      // 3. Greeting-variant match (e.g. keyword "hi" also matches a message
      // that's just "hey"/"hie"/"hello" — different letters entirely, so
      // neither the substring nor repeated-character checks above catch it).
      if (isKnownGreeting(cleanKeyword) && canonicalizeGreeting(cleanedText) === canonicalizeGreeting(cleanKeyword)) {
        return rule.replyMessage;
      }
    }
  }

  return null;
}
