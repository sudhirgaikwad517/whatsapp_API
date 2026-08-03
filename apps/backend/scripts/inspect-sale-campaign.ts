import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectSale() {
  const c = await prisma.campaign.findFirst({
    where: { name: 'Sale' },
    orderBy: { createdAt: 'desc' },
    include: {
      template: true,
      recipients: { include: { contact: true } },
    },
  });

  if (!c) {
    console.log('Campaign Sale not found');
    return;
  }

  console.log(`Campaign Name: "${c.name}" | Status: ${c.status} | Total Target: ${c.totalTarget}`);
  console.log(`SentCount: ${c.sentCount} | DeliveredCount: ${c.deliveredCount} | FailedCount: ${c.failedCount}`);
  console.log('\n--- RECIPIENTS BREAKDOWN ---');
  for (const r of c.recipients) {
    console.log(`Phone: ${r.contact.phoneNumber} | Status: ${r.status} | WAMID: ${r.wamid || 'NONE'} | Error: ${r.errorMessage || 'NONE'}`);
  }
}

inspectSale()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
