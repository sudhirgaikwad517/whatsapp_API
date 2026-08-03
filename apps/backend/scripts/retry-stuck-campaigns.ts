import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { createRedisConnection } from '../src/config/redis.js';

const prisma = new PrismaClient();
const marketingQueue = new Queue('marketing-campaign', {
  connection: createRedisConnection(),
});

async function retry() {
  console.log('🔄 Checking for PROCESSING campaigns in database...');

  const campaigns = await prisma.campaign.findMany({
    where: { status: 'PROCESSING' },
    include: {
      template: true,
      recipients: { include: { contact: true } },
    },
  });

  console.log(`Found ${campaigns.length} campaigns in PROCESSING status.`);

  for (const campaign of campaigns) {
    console.log(`Re-enqueueing campaign: ${campaign.name} (${campaign.recipients.length} recipients)`);

    for (const recipient of campaign.recipients) {
      await marketingQueue.add('send-campaign-message', {
        campaignId: campaign.id,
        organizationId: campaign.organizationId,
        contactId: recipient.contactId,
        phoneNumber: recipient.contact.phoneNumber,
        templateName: campaign.template.name,
        templateLanguage: campaign.template.language,
      });
    }
  }

  console.log('✅ All stuck campaign dispatches enqueued to worker!');
}

retry()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
