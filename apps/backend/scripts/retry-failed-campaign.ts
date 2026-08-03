import { PrismaClient } from '@prisma/client';
import { marketingQueue } from '../src/queues/index.js';

const prisma = new PrismaClient();

async function retryFailed() {
  console.log('🔄 Retrying recent failed campaign recipients...');

  const orgId = '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';
  const failedRecipients = await prisma.campaignRecipient.findMany({
    where: { status: 'FAILED' },
    include: { campaign: { include: { template: true } }, contact: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  for (const r of failedRecipients) {
    console.log(`Retrying recipient ${r.contact.phoneNumber} for campaign "${r.campaign.name}"...`);
    await prisma.campaignRecipient.update({
      where: { id: r.id },
      data: { status: 'SENT', errorMessage: null },
    });

    await marketingQueue.add('send-campaign-message', {
      campaignId: r.campaignId,
      recipientId: r.id,
      contactId: r.contactId,
      phoneNumber: r.contact.phoneNumber,
      organizationId: orgId,
      templateName: r.campaign.template.name,
      templateLanguage: r.campaign.template.language,
    });
  }

  console.log('✅ Retried jobs added to BullMQ!');
}

retryFailed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
