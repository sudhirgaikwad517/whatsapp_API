import { PrismaClient } from '@prisma/client';
import { marketingQueue } from '../src/queues/index.js';

const prisma = new PrismaClient();

async function createTestCampaign() {
  console.log('🚀 Creating live test campaign for jaspers_market_order_confirmation_v1...');

  const orgId = '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';
  const waAccount = await prisma.whatsappAccount.findFirst({ where: { organizationId: orgId } });
  const template = await prisma.template.findFirst({ where: { name: 'jaspers_market_order_confirmation_v1' } });
  const contact = await prisma.contact.findFirst({ where: { phoneNumber: '+917666130611' } });

  if (!waAccount || !template || !contact) {
    console.error('Missing db prerequisites');
    return;
  }

  const campaign = await prisma.campaign.create({
    data: {
      organizationId: orgId,
      name: `Order Confirmation Test ${Date.now()}`,
      templateId: template.id,
      status: 'PROCESSING',
      totalTarget: 1,
      recipients: {
        create: [
          {
            contactId: contact.id,
            status: 'SENT',
          },
        ],
      },
    },
    include: { recipients: true },
  });

  for (const r of campaign.recipients) {
    await marketingQueue.add('send-campaign-message', {
      campaignId: campaign.id,
      recipientId: r.id,
      contactId: contact.id,
      phoneNumber: contact.phoneNumber,
      organizationId: orgId,
      templateName: template.name,
      templateLanguage: template.language,
    });
  }

  console.log(`✅ Test Campaign created! ID: ${campaign.id}. Enqueued to BullMQ.`);
}

createTestCampaign()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
