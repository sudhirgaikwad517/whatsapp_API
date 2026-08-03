import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { sendMetaOutboundMessage } from '../services/meta-whatsapp.service.js';

interface CampaignMessageJobData {
  campaignId: string;
  organizationId: string;
  contactId: string;
  phoneNumber: string;
  templateName: string;
  templateLanguage: string;
  headerMediaUrl?: string;
}

/**
 * BullMQ Marketing Worker: Processes bulk campaign template dispatches
 */
export const campaignWorker = new Worker(
  'marketing-campaign',
  async (job: Job) => {
    const data = job.data as CampaignMessageJobData;
    logger.info({ jobId: job.id, campaignId: data.campaignId, phone: data.phoneNumber }, 'Processing campaign broadcast job');

    try {
      // Fetch template definition to check for variables
      const tpl = await prisma.template.findFirst({
        where: { organizationId: data.organizationId, name: data.templateName },
      });

      const contact = await prisma.contact.findUnique({ where: { id: data.contactId } });
      const recipientName = contact?.firstName || 'Customer';

      const templateObject: any = {
        name: data.templateName,
        language: { code: data.templateLanguage || 'en_US' },
      };

      interface CampaignMessageJobData {
        campaignId: string;
        organizationId: string;
        contactId: string;
        phoneNumber: string;
        templateName: string;
        templateLanguage: string;
        headerMediaUrl?: string;
      }

      const componentsList: any[] = [];

      // Add Header Image / Media Parameter if provided
      if (data.headerMediaUrl) {
        componentsList.push({
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: { link: data.headerMediaUrl },
            },
          ],
        });
      }

      // Auto-populate body parameters matching the exact count of placeholders (e.g. {{1}}, {{2}}, {{3}})
      if (tpl?.components && Array.isArray(tpl.components)) {
        const bodyComp = (tpl.components as any[]).find((c) => c.type === 'BODY' || c.type === 'body');
        if (bodyComp?.text) {
          const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g);
          if (matches && matches.length > 0) {
            const params = matches.map((_: string, idx: number) => {
              if (idx === 0) return { type: 'text', text: recipientName };
              if (idx === 1) return { type: 'text', text: 'Shrishti Dairy Farm' };
              if (idx === 2) return { type: 'text', text: 'Pure A2 Milk' };
              return { type: 'text', text: 'Valued Customer' };
            });
            componentsList.push({
              type: 'body',
              parameters: params,
            });
          }
        }
      }

      if (componentsList.length > 0) {
        templateObject.components = componentsList;
      }

      // 1. Dispatch template message via Meta Graph API
      const metaRes = await sendMetaOutboundMessage(data.organizationId, data.phoneNumber, {
        type: 'template',
        template: templateObject,
      });

      // 2. Resolve WhatsApp Account for this organization
      const waAccount = await prisma.whatsappAccount.findFirst({
        where: { organizationId: data.organizationId, deletedAt: null },
      });

      if (waAccount) {
        // Upsert conversation (24-hour window extension)
        const windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const conversation = await prisma.conversation.upsert({
          where: {
            whatsappAccountId_contactId: {
              whatsappAccountId: waAccount.id,
              contactId: data.contactId,
            },
          },
          update: {
            windowExpiresAt,
            lastMessageSnippet: `[Template: ${data.templateName}]`,
            lastMessageAt: new Date(),
            status: 'OPEN',
          },
          create: {
            organizationId: data.organizationId,
            whatsappAccountId: waAccount.id,
            contactId: data.contactId,
            windowExpiresAt,
            lastMessageSnippet: `[Template: ${data.templateName}]`,
            lastMessageAt: new Date(),
            status: 'OPEN',
          },
        });

        // Save outbound message to database so it appears in Live Inbox
        await prisma.message.create({
          data: {
            organizationId: data.organizationId,
            conversationId: conversation.id,
            wamid: metaRes.wamid,
            direction: 'OUTBOUND',
            type: 'TEMPLATE',
            content: { templateName: data.templateName, language: data.templateLanguage },
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      }

      // 3. Update recipient log status to SENT
      await prisma.campaignRecipient.updateMany({
        where: { campaignId: data.campaignId, contactId: data.contactId },
        data: {
          wamid: metaRes.wamid,
          status: 'SENT',
        },
      });

      // 3. Increment campaign sent count
      await prisma.campaign.update({
        where: { id: data.campaignId },
        data: {
          sentCount: { increment: 1 },
        },
      });

      logger.info({ campaignId: data.campaignId, wamid: metaRes.wamid }, 'Campaign message dispatched successfully');
    } catch (err: any) {
      logger.error({ campaignId: data.campaignId, err: err.message }, 'Failed to dispatch campaign message');

      // Update recipient log status to FAILED
      await prisma.campaignRecipient.updateMany({
        where: { campaignId: data.campaignId, contactId: data.contactId },
        data: {
          status: 'FAILED',
          errorMessage: err.message || 'Meta API Dispatch Failed',
        },
      });

      // Increment campaign failed count
      await prisma.campaign.update({
        where: { id: data.campaignId },
        data: {
          failedCount: { increment: 1 },
        },
      });
    }

    // 4. Check if campaign completion condition is met
    const campaign = await prisma.campaign.findUnique({
      where: { id: data.campaignId },
    });

    if (campaign) {
      const processedTotal = campaign.sentCount + campaign.failedCount;
      if (processedTotal >= campaign.totalTarget) {
        await prisma.campaign.update({
          where: { id: data.campaignId },
          data: { status: 'COMPLETED' },
        });
        logger.info({ campaignId: data.campaignId }, 'Campaign broadcast marked COMPLETED');
      }
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 10,
    limiter: {
      max: 80, // Max 80 messages per second (Meta tier rate limiter)
      duration: 1000,
    },
  }
);

campaignWorker.on('completed', (job) => {
  logger.debug({ jobId: job.id }, 'Campaign job completed.');
});

campaignWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Campaign job failed.');
});
