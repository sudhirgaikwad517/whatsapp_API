import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectTemplate() {
  const tpl = await prisma.template.findFirst({
    where: { name: 'jaspers_market_order_confirmation_v1' },
  });

  console.log('--- TEMPLATE JSON COMPONENTS ---');
  console.log(JSON.stringify(tpl, null, 2));
}

inspectTemplate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
