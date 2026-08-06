import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const orgId = 'd59c2051-ee4b-49a8-b786-15d39fd1a18a'; // Shrishti Dairy

  const result = await prisma.$queryRaw`
    SELECT 
      COUNT(*) FILTER (WHERE t."category" ILIKE 'marketing') as marketing_sent,
      COUNT(*) FILTER (WHERE t."category" ILIKE 'utility') as utility_sent
    FROM "Message" m
    LEFT JOIN "Template" t ON m."content"->>'templateName' = t."name" AND t."organizationId" = m."organizationId"
    WHERE m."organizationId" = ${orgId}::uuid
      AND m."direction" = 'OUTBOUND'
      AND m."type" = 'TEMPLATE'
      AND m."status" != 'FAILED'
  `;

  console.log(result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
