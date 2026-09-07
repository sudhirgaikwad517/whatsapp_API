import { Prisma, PrismaClient } from '@prisma/client';

export type QueryableClient = PrismaClient | Prisma.TransactionClient;

export interface TemplateSentCounts {
  marketingSent: number;
  utilitySent: number;
}

export interface PricingRates {
  marketingMetaCost: number;
  marketingClientPrice: number;
  utilityMetaCost: number;
  utilityClientPrice: number;
}

// Used only when the SuperAdmin hasn't set a PricingRule for this category/
// country yet — the same India rate-card figures this codebase always used
// before the Pricing Rules tab existed.
const DEFAULT_PRICING_RATES: PricingRates = {
  marketingMetaCost: 0.86309,
  marketingClientPrice: 1.0,
  utilityMetaCost: 0.115,
  utilityClientPrice: 0.2,
};

/**
 * The single source of truth for "what do we charge, and what does Meta
 * charge us" — read from the PricingRule table the SuperAdmin's Pricing
 * Rules & Markups tab writes to, falling back to the historical hardcoded
 * India rate card for any category that hasn't been explicitly configured
 * yet. Every place in the codebase that computes billing/cost figures
 * (wallet reconciliation, superadmin telemetry, per-org financials) should
 * call this instead of hardcoding rate constants directly, so a rate change
 * saved in the Pricing Rules tab actually takes effect everywhere.
 */
export async function getPricingRates(client: QueryableClient, countryCode: string = 'IN'): Promise<PricingRates> {
  const rules = await client.pricingRule.findMany({ where: { countryCode } });
  const marketing = rules.find((r) => r.conversationCategory === 'MARKETING');
  const utility = rules.find((r) => r.conversationCategory === 'UTILITY');

  return {
    marketingMetaCost: marketing ? Number(marketing.metaCost) : DEFAULT_PRICING_RATES.marketingMetaCost,
    marketingClientPrice: marketing ? Number(marketing.totalPrice) : DEFAULT_PRICING_RATES.marketingClientPrice,
    utilityMetaCost: utility ? Number(utility.metaCost) : DEFAULT_PRICING_RATES.utilityMetaCost,
    utilityClientPrice: utility ? Number(utility.totalPrice) : DEFAULT_PRICING_RATES.utilityClientPrice,
  };
}

/**
 * Counts successfully-sent OUTBOUND template messages, split by Meta template
 * category (marketing vs. utility) — the basis for both usage billing and
 * superadmin revenue/profit telemetry. Shared across billing and superadmin
 * services so a change to this definition (e.g. which statuses count) only
 * has to happen in one place.
 *
 * A utility template sent while the contact's 24-hour customer service
 * window is already open (i.e. they messaged in within the preceding 24h)
 * is free on Meta's side, so it's excluded from utility_sent here too —
 * otherwise the wallet gets debited, and this platform-wide telemetry
 * overstates Meta's real payable liability, for a message Meta never
 * actually billed. Marketing and authentication templates are always
 * billed regardless of window status, so they're not given this exemption.
 * "Was the window open" is computed fresh per-message via a correlated
 * inbound-message check rather than trusting Conversation.windowExpiresAt,
 * since that field is a live, overwritable snapshot of the *current* state —
 * it can't tell you what the window looked like at some earlier message's
 * send time.
 *
 * Pass `organizationId` to scope to a single tenant, or omit it for a
 * platform-wide count. Pass `startDate` to restrict to messages sent on/after
 * that time. `client` may be the main Prisma client or an active `$transaction`
 * client (needed by billing-wallet.service.ts's locked recharge flow).
 */
export async function getTemplateSentCounts(
  client: QueryableClient,
  options: { organizationId?: string; startDate?: Date } = {}
): Promise<TemplateSentCounts> {
  const { organizationId, startDate } = options;

  const rows = await client.$queryRaw<{ marketing_sent: bigint | number; utility_sent: bigint | number }[]>`
    SELECT
      COUNT(*) FILTER (WHERE t."category" ILIKE 'marketing') as marketing_sent,
      COUNT(*) FILTER (
        WHERE t."category" ILIKE 'utility'
          AND NOT EXISTS (
            SELECT 1 FROM "Message" im
            WHERE im."conversationId" = m."conversationId"
              AND im."direction" = 'INBOUND'
              AND im."createdAt" <= m."createdAt"
              AND im."createdAt" > m."createdAt" - INTERVAL '24 hours'
          )
      ) as utility_sent
    FROM "Message" m
    INNER JOIN "Template" t ON m."content"->>'templateName' = t."name" AND t."organizationId" = m."organizationId"
    WHERE m."direction" = 'OUTBOUND'
      AND m."type" = 'TEMPLATE'
      AND m."status" != 'FAILED'
      ${organizationId ? Prisma.sql`AND m."organizationId" = ${organizationId}::uuid` : Prisma.empty}
      ${startDate ? Prisma.sql`AND m."createdAt" >= ${startDate}` : Prisma.empty}
  `;

  return {
    marketingSent: Number(rows[0]?.marketing_sent || 0),
    utilitySent: Number(rows[0]?.utility_sent || 0),
  };
}
