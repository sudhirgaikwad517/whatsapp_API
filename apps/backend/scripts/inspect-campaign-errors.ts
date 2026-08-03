import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectCampaigns() {
  console.log('🔍 Inspecting recent Campaign dispatches and errors...');

  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      template: true,
      recipients: {
        include: { contact: true },
      },
    },
  });

  for (const c of campaigns) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Campaign: "${c.name}" | Status: ${c.status} | Template: ${c.template.name} (${c.template.language})`);
    console.log(`Total: ${c.totalTarget} | Sent: ${c.sentCount} | Delivered: ${c.deliveredCount} | Failed: ${c.failedCount}`);

    for (const r of c.recipients) {
      console.log(`  Recipient: ${r.contact.phoneNumber} | Status: ${r.status} | WAMID: ${r.wamid || 'NONE'} | Error: ${r.errorMessage || 'NONE'}`);
    }
  }
}

inspectCampaigns()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
