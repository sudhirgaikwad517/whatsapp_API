import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const msg = await prisma.message.findFirst({
    where: { type: 'TEMPLATE', direction: 'OUTBOUND' },
  });
  console.log(JSON.stringify(msg, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
