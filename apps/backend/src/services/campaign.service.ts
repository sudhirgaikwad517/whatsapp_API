import { prisma } from '../config/database.js';
import { marketingQueue } from '../queues/index.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { cleanPhone } from './contact.service.js';

export interface CsvContactItem {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface CreateCampaignInput {
  name: string;
  templateId: string;
  headerMediaUrl?: string;
  scheduledAt?: string;
  audienceSource?: 'CRM' | 'CSV';
  tagIds?: string[];
  csvContacts?: CsvContactItem[];
}

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function createCampaign(organizationId: string, input: CreateCampaignInput) {
  // Gracefully handle lookup by UUID, template name, or metaTemplateId
  const isUuid = UUID_REGEX.test(input.templateId);

  const template = await prisma.template.findFirst({
    where: {
      organizationId,
      ...(isUuid
        ? { id: input.templateId }
        : {
            OR: [
              { name: input.templateId },
              { metaTemplateId: input.templateId },
            ],
          }),
    },
  });

  if (!template) {
    throw new AppError(
      `Template "${input.templateId}" not found. Please sync approved templates in Settings or select a valid template.`,
      404,
      'TEMPLATE_NOT_FOUND'
    );
  }
  if (template.status !== 'APPROVED') {
    throw new AppError(
      `Template "${template.name}" is currently in "${template.status}" status. Only APPROVED WhatsApp templates can be used for dispatches.`,
      400,
      'TEMPLATE_NOT_APPROVED'
    );
  }

  let targetContacts: Array<{ id: string; phoneNumber: string; firstName?: string | null }> = [];

  if (input.audienceSource === 'CSV' && input.csvContacts?.length) {
    // ── Option B: CSV Upload Specific Audience ─────────────────────────────
    for (const rawContact of input.csvContacts) {
      if (!rawContact.phoneNumber) continue;
      const formattedPhone = cleanPhone(rawContact.phoneNumber);

      // Find or create in CRM to ensure zero duplicate contacts
      let contact = await prisma.contact.findUnique({
        where: {
          organizationId_phoneNumber: {
            organizationId,
            phoneNumber: formattedPhone,
          },
        },
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            organizationId,
            phoneNumber: formattedPhone,
            firstName: rawContact.firstName || null,
            lastName: rawContact.lastName || null,
            email: rawContact.email || null,
            isOptedIn: true,
          },
        });
      } else if (rawContact.firstName && !contact.firstName) {
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: { firstName: rawContact.firstName },
        });
      }

      if (contact.isOptedIn !== false && !contact.deletedAt) {
        targetContacts.push({
          id: contact.id,
          phoneNumber: contact.phoneNumber,
          firstName: contact.firstName,
        });
      }
    }
  } else {
    // ── Option A: Existing CRM Audience Selection ──────────────────────────
    const contactWhere: any = { organizationId, deletedAt: null, NOT: { isOptedIn: false } };
    if (input.tagIds?.length) {
      contactWhere.tags = { some: { tagId: { in: input.tagIds } } };
    }

    targetContacts = await prisma.contact.findMany({
      where: contactWhere,
      select: { id: true, phoneNumber: true, firstName: true },
    });
  }

  if (!targetContacts.length) {
    throw new AppError('No eligible opted-in contacts found for the selected campaign audience.', 400, 'NO_TARGET_CONTACTS');
  }

  // Create campaign record with recipient snapshots
  const campaign = await prisma.campaign.create({
    data: {
      organizationId,
      templateId: template.id,
      name: input.name,
      status: input.scheduledAt ? 'SCHEDULED' : 'PROCESSING',
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      totalTarget: targetContacts.length,
      recipients: {
        create: targetContacts.map((c) => ({
          contactId: c.id,
          phoneNumberSnapshot: c.phoneNumber,
          nameSnapshot: c.firstName || 'Customer',
          status: 'ACCEPTED',
        })),
      },
    },
    include: { template: true },
  });

  // Enqueue jobs to BullMQ marketing queue
  const delay = input.scheduledAt ? Math.max(0, new Date(input.scheduledAt).getTime() - Date.now()) : 0;

  for (const contact of targetContacts) {
    await marketingQueue.add(
      'send-campaign-message',
      {
        campaignId: campaign.id,
        organizationId,
        contactId: contact.id,
        phoneNumber: contact.phoneNumber,
        templateName: template.name,
        templateLanguage: template.language,
        headerMediaUrl: input.headerMediaUrl,
      },
      { delay }
    );
  }

  return campaign;
}

export async function listCampaigns(organizationId: string) {
  const activeWa = await prisma.whatsappAccount.findFirst({
    where: { organizationId, deletedAt: null },
  });

  const campaigns = await prisma.campaign.findMany({
    where: {
      organizationId,
      ...(activeWa ? { template: { whatsappAccountId: activeWa.id } } : {}),
    },
    include: { template: { select: { id: true, name: true, category: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    campaigns.map(async (c) => {
      const [sentCount, deliveredCount, readCount, repliedCount, failedCount] = await Promise.all([
        prisma.campaignRecipient.count({ where: { campaignId: c.id, sentAt: { not: null } } }),
        prisma.campaignRecipient.count({ where: { campaignId: c.id, deliveredAt: { not: null } } }),
        prisma.campaignRecipient.count({ where: { campaignId: c.id, readAt: { not: null } } }),
        prisma.campaignRecipient.count({ where: { campaignId: c.id, repliedAt: { not: null } } }),
        prisma.campaignRecipient.count({ where: { campaignId: c.id, status: 'FAILED' } }),
      ]);

      const pendingCount = Math.max(0, c.totalTarget - (sentCount + failedCount));
      const deliveryRate = sentCount > 0 ? Number(((deliveredCount / sentCount) * 100).toFixed(1)) : 0;
      const readRate = deliveredCount > 0 ? Number(((readCount / deliveredCount) * 100).toFixed(1)) : 0;
      const replyRate = deliveredCount > 0 ? Number(((repliedCount / deliveredCount) * 100).toFixed(1)) : 0;

      return {
        ...c,
        sentCount,
        deliveredCount,
        readCount,
        repliedCount,
        failedCount,
        pendingCount,
        deliveryRate,
        readRate,
        replyRate,
      };
    })
  );
}

export async function getCampaignAnalytics(organizationId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
    include: {
      template: true,
    },
  });

  if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');

  const [sentCount, deliveredCount, readCount, repliedCount, failedCount] = await Promise.all([
    prisma.campaignRecipient.count({ where: { campaignId, sentAt: { not: null } } }),
    prisma.campaignRecipient.count({ where: { campaignId, deliveredAt: { not: null } } }),
    prisma.campaignRecipient.count({ where: { campaignId, readAt: { not: null } } }),
    prisma.campaignRecipient.count({ where: { campaignId, repliedAt: { not: null } } }),
    prisma.campaignRecipient.count({ where: { campaignId, status: 'FAILED' } }),
  ]);

  const pendingCount = Math.max(0, campaign.totalTarget - (sentCount + failedCount));
  const deliveryRate = sentCount > 0 ? Number(((deliveredCount / sentCount) * 100).toFixed(1)) : 0;
  const readRate = deliveredCount > 0 ? Number(((readCount / deliveredCount) * 100).toFixed(1)) : 0;
  const replyRate = deliveredCount > 0 ? Number(((repliedCount / deliveredCount) * 100).toFixed(1)) : 0;

  return {
    ...campaign,
    sentCount,
    deliveredCount,
    readCount,
    repliedCount,
    failedCount,
    pendingCount,
    deliveryRate,
    readRate,
    replyRate,
  };
}

export async function getCampaignRecipients(
  organizationId: string,
  campaignId: string,
  options: { tab?: string; search?: string; page?: number; limit?: number }
) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
  });

  if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');

  const tab = (options.tab || 'ALL').toUpperCase();
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 50));
  const skip = (page - 1) * limit;

  const where: any = { campaignId };

  if (tab === 'SENT') {
    where.sentAt = { not: null };
  } else if (tab === 'DELIVERED') {
    where.deliveredAt = { not: null };
  } else if (tab === 'READ') {
    where.readAt = { not: null };
  } else if (tab === 'REPLIED') {
    where.repliedAt = { not: null };
  } else if (tab === 'FAILED') {
    where.status = 'FAILED';
  } else if (tab === 'PENDING') {
    where.status = 'ACCEPTED';
    where.sentAt = null;
  }

  if (options.search) {
    const searchStr = options.search.trim();
    const searchCondition = {
      OR: [
        { phoneNumberSnapshot: { contains: searchStr } },
        { nameSnapshot: { contains: searchStr, mode: 'insensitive' } },
      ],
    };

    if (where.OR) {
      where.AND = [searchCondition];
    } else {
      where.OR = searchCondition.OR;
    }
  }

  const [recipients, total] = await Promise.all([
    prisma.campaignRecipient.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            phoneNumber: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.campaignRecipient.count({ where }),
  ]);

  return {
    recipients,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function retryCampaign(organizationId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
    include: {
      template: true,
      recipients: {
        where: { status: { in: ['ACCEPTED', 'FAILED'] } },
        include: { contact: { select: { id: true, phoneNumber: true } } },
      },
    },
  });

  if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');

  if (!campaign.recipients.length) {
    throw new AppError('No unsent or failed recipients to retry for this campaign.', 400, 'NO_RECIPIENTS_TO_RETRY');
  }

  // Update status to PROCESSING
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'PROCESSING' },
  });

  // Re-enqueue jobs to BullMQ for unsent/failed recipients
  for (const rec of campaign.recipients) {
    await marketingQueue.add(
      'send-campaign-message',
      {
        campaignId: campaign.id,
        organizationId,
        contactId: rec.contact.id,
        phoneNumber: rec.contact.phoneNumber,
        templateName: campaign.template.name,
        templateLanguage: campaign.template.language,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
      }
    );
  }

  return { success: true, retriedCount: campaign.recipients.length, message: `Re-queued ${campaign.recipients.length} messages for dispatch.` };
}

export async function deleteCampaign(organizationId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
  });

  if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');

  await prisma.campaign.delete({
    where: { id: campaignId },
  });

  return { success: true, message: 'Campaign deleted successfully.' };
}
