const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany();
  const org = orgs.find(o => o.name.toLowerCase().includes('prowexa'));
  if(!org) return console.log('Org not found');
  
  const msgs = await prisma.message.findMany({ 
    where: { organizationId: org.id, direction: 'OUTBOUND', type: 'TEMPLATE' } 
  });
  console.log('Total Messages:', msgs.length);
  msgs.forEach(m => console.log(m.id, m.status, JSON.stringify(m.content)));

  const templateCount = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE t."category" ILIKE 'marketing') as marketing_sent,
        COUNT(*) FILTER (WHERE t."category" ILIKE 'utility') as utility_sent
      FROM "Message" m
      INNER JOIN "Template" t ON m."content"->>'templateName' = t."name" AND t."organizationId" = m."organizationId"
      WHERE m."organizationId" = ${org.id}::uuid
        AND m."direction" = 'OUTBOUND'
        AND m."type" = 'TEMPLATE'
        AND m."status" != 'FAILED'
    `;
    console.log(templateCount);
}

main().catch(console.error).finally(() => prisma.$disconnect());
