import { Prisma, PrismaClient } from '@prisma/client';

type QueryableClient = PrismaClient | Prisma.TransactionClient;

export interface TemplateSentCounts {
  marketingSent: number;
  utilitySent: number;
}

/**
 * Counts successfully-sent OUTBOUND template messages, split by Meta template
 * category (marketing vs. utility) — the basis for both usage billing and
 * superadmin revenue/profit telemetry. Shared across billing and superadmin
 * services so a change to this definition (e.g. which statuses count) only
 * has to happen in one place.
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
      COUNT(*) FILTER (WHERE t."category" ILIKE 'utility') as utility_sent
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
