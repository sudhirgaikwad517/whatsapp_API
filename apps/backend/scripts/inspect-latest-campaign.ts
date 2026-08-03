import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectLatest() {
  const c = await prisma.campaign.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      template: true,
      recipients: { include: { contact: true } },
    },
  });

  if (!c) {
    console.log('No campaign found');
    return;
  }

  console.log(`Campaign Name: "${c.name}" | Status: ${c.status} | Total Target: ${c.totalTarget}`);
  console.log(`SentCount: ${c.sentCount} | DeliveredCount: ${c.deliveredCount} | FailedCount: ${c.failedCount}`);
  console.log('\n--- RECIPIENTS BREAKDOWN ---');
  for (const r of c.recipients) {
    console.log(`Phone: ${r.contact.phoneNumber} | OptIn: ${r.contact.isOptedIn} | Status: ${r.status} | WAMID: ${r.wamid || 'NONE'} | Error: ${r.errorMessage || 'NONE'}`);
  }
}

inspectLatest()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
