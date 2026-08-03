import { PrismaClient } from '@prisma/client';
import { marketingQueue } from '../src/queues/index.js';

const prisma = new PrismaClient();

async function fixContactAndRetry() {
  console.log('🔧 Updating contact phone numbers to full E.164 (+91)...');

  // Update contact phone number
  const updatedContact = await prisma.contact.updateMany({
    where: { phoneNumber: '8010450043' },
    data: { phoneNumber: '+918010450043' },
  });

  console.log(`Updated ${updatedContact.count} contact(s).`);

  // Retry the campaign
  const campaign = await prisma.campaign.findFirst({
    where: { name: 'Sale' },
    orderBy: { createdAt: 'desc' },
    include: { template: true, recipients: { include: { contact: true } } },
  });

  if (!campaign) {
    console.log('Campaign not found');
    return;
  }

  console.log(`Retrying campaign "${campaign.name}" (ID: ${campaign.id})...`);

  for (const r of campaign.recipients) {
    if (r.status === 'FAILED') {
      await prisma.campaignRecipient.update({
        where: { id: r.id },
        data: { status: 'SENT', errorMessage: null },
      });

      await marketingQueue.add('send-campaign-message', {
        campaignId: campaign.id,
        recipientId: r.id,
        contactId: r.contactId,
        phoneNumber: r.contact.phoneNumber,
        organizationId: campaign.organizationId,
        templateName: campaign.template.name,
        templateLanguage: campaign.template.language,
      });
      console.log(`Enqueued retry for contact: ${r.contact.phoneNumber}`);
    }
  }
}

fixContactAndRetry()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
