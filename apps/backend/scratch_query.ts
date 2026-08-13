import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({ where: { slug: 'prowexa-technologies' } });
  if (!org) return console.log('Org prowexa-technologies not found');
  
  const msgs = await prisma.message.findMany({ 
    where: { organizationId: org.id, direction: 'OUTBOUND', type: 'TEMPLATE' } 
  });
  console.log(`Org: ${org.name} - Total Messages: ${msgs.length}`);
  for (const m of msgs) {
      console.log(m.id, m.status, JSON.stringify(m.content));
  }

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
  console.log('Query result:', templateCount);
  
  const templates = await prisma.template.findMany({ where: { organizationId: org.id }});
  console.log('Templates:', templates.map(t => ({ name: t.name, category: t.category })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
