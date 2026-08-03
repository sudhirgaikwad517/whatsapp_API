import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  const msgs = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { conversation: { include: { contact: true } } },
  });

  console.log(`--- LAST ${msgs.length} MESSAGES IN DB ---`);
  for (const m of msgs) {
    console.log(`[${m.direction}] ${m.createdAt.toISOString()} | Phone: ${m.conversation.contact.phoneNumber} | Content: ${JSON.stringify(m.content)} | WAMID: ${m.wamid}`);
  }
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
