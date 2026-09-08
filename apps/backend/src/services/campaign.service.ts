import { prisma } from '../config/database.js';
import { marketingQueue } from '../queues/index.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { cleanPhone } from './contact.service.js';

export interface CsvContactItem {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  customAttributes?: Record<string, string>;
}

export interface CreateCampaignInput {
  name: string;
  templateId: string;
  headerMediaUrl?: string;
  scheduledAt?: string;
  audienceSource?: 'CRM' | 'CSV';
  tagIds?: string[];
  csvContacts?: CsvContactItem[];
  isBatchEnabled?: boolean;
  batchSize?: number;
  batchIntervalMinutes?: number;
  variableMapping?: Record<string, string>;
  campaignKnowledgeBase?: string;
  // CSV audience only — when false, a phone number that doesn't already
  // exist as a CRM contact is still created (CampaignRecipient.contactId is
  // a required FK, so a row must exist to track delivery), but immediately
  // soft-deleted so it never shows up in Contacts CRM. Existing CRM contacts
  // matched by phone are never touched by this flag either way.
  saveContactsToCrm?: boolean;
}

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function formatTitleCase(str?: string | null): string {
  if (!str || !str.trim()) return '';
  const cleanStr = str.trim().replace(/^["']+|["']+$|["']/g, '');
  if (!cleanStr) return '';
  return cleanStr
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function parseFullName(rawName?: string | null): { firstName: string; lastName?: string } {
  if (!rawName || !rawName.trim()) return { firstName: 'Customer' };
  const formatted = formatTitleCase(rawName);
  const parts = formatted.split(' ');
  const firstName = parts[0] || 'Customer';
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName: lastName || undefined };
}

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
    // ── Option B: CSV Upload Specific Audience (Full Name in CRM, First Name in Campaign) ──
    const processedPhones = new Set<string>();
    const saveToCrm = input.saveContactsToCrm !== false;

    for (const rawContact of input.csvContacts) {
      if (!rawContact.phoneNumber) continue;
      const formattedPhone = cleanPhone(rawContact.phoneNumber);
      if (processedPhones.has(formattedPhone)) continue; // Skip duplicate inside CSV file
      processedPhones.add(formattedPhone);

      const { firstName, lastName } = parseFullName(rawContact.firstName);

      // Find existing contact in CRM (Deduplication against existing database)
      let contact = await prisma.contact.findUnique({
        where: {
          organizationId_phoneNumber: {
            organizationId,
            phoneNumber: formattedPhone,
          },
        },
      });
      const isNewlyCreatedThisRun = !contact;

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            organizationId,
            phoneNumber: formattedPhone,
            firstName,
            lastName,
            email: rawContact.email,
            customAttributes: rawContact.customAttributes || {},
            isOptedIn: true,
            // A CampaignRecipient row always needs a real contactId (required
            // FK, used for delivery-status tracking/analytics) — when the
            // agent declined to save this as a real CRM contact, mark it
            // deleted immediately so it's invisible in Contacts CRM from the
            // start. If this number messages in later, the inbound-message
            // contact lookup only matches non-deleted contacts, so it gets a
            // fresh, visible contact rather than resurrecting this one.
            ...(saveToCrm ? {} : { deletedAt: new Date() }),
          },
        });
      } else {
        // Update contact with customAttributes and name if available
        contact = await prisma.contact.update({
          where: { id: contact.id },
          data: {
            ...(firstName && (!contact.firstName || contact.firstName === 'Customer') ? { firstName, ...(lastName ? { lastName } : {}) } : {}),
            ...(rawContact.customAttributes ? { customAttributes: { ...((contact.customAttributes as object) || {}), ...rawContact.customAttributes } } : {}),
          },
        });
      }

      // A contact we ourselves just soft-deleted a moment ago (the
      // saveContactsToCrm: false path above) must still receive this
      // campaign — only a genuinely pre-existing deleted/opted-out contact
      // is meant to be excluded here.
      const intentionallyHiddenJustNow = isNewlyCreatedThisRun && !saveToCrm;
      if (contact.isOptedIn !== false && (!contact.deletedAt || intentionallyHiddenJustNow)) {
        targetContacts.push({
          id: contact.id,
          phoneNumber: contact.phoneNumber,
          firstName: contact.firstName || firstName,
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

  const isBatchEnabled = Boolean(input.isBatchEnabled);
  const batchSize = Math.max(50, Number(input.batchSize) || 50);
  const batchIntervalMinutes = Math.max(1, Number(input.batchIntervalMinutes) || 20);

  // Create campaign record with recipient snapshots
  const campaign = await prisma.campaign.create({
    data: {
      organizationId,
      templateId: template.id,
      name: input.name,
      status: input.scheduledAt ? 'SCHEDULED' : 'PROCESSING',
      scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      totalTarget: targetContacts.length,
      isBatchEnabled,
      batchSize,
      batchIntervalMinutes,
      variableMapping: input.variableMapping || {},
      campaignKnowledgeBase: input.campaignKnowledgeBase?.trim() || null,
      headerMediaUrl: input.headerMediaUrl?.trim() || null,
      recipients: {
        create: targetContacts.map((c) => ({
          contactId: c.id,
          phoneNumberSnapshot: c.phoneNumber,
          nameSnapshot: c.firstName ? c.firstName.split(' ')[0] : 'Customer',
          status: 'ACCEPTED',
        })),
      },
    },
    include: { template: true },
  });

  // Enqueue jobs to BullMQ marketing queue
  const baseDelay = input.scheduledAt ? Math.max(0, new Date(input.scheduledAt).getTime() - Date.now()) : 0;
  const batchIntervalMs = batchIntervalMinutes * 60 * 1000;

  for (let i = 0; i < targetContacts.length; i++) {
    const contact = targetContacts[i];
    const batchIndex = isBatchEnabled ? Math.floor(i / batchSize) : 0;
    const batchDelayMs = isBatchEnabled ? batchIndex * batchIntervalMs : 0;
    const totalJobDelay = baseDelay + batchDelayMs;

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
      { delay: totalJobDelay }
    );
  }

  return campaign;
}

export async function listCampaigns(organizationId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: {
      organizationId,
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
  const limit = Math.min(50000, Math.max(1, options.limit || 50));
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
        where: {
          status: 'ACCEPTED',
          sentAt: null,
        },
        include: { contact: { select: { id: true, phoneNumber: true } } },
      },
    },
  });

  if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');

  if (!campaign.recipients.length) {
    throw new AppError('No unsent or pending recipients to resume for this campaign.', 400, 'NO_RECIPIENTS_TO_RETRY');
  }

  // Update status to PROCESSING
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'PROCESSING' },
  });

  // Re-enqueue jobs to BullMQ for unsent recipients only
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
        // Omitting this (as this re-enqueue previously did) meant resuming
        // any campaign that used an IMAGE-header template sent every
        // remaining recipient's message with no header component at all —
        // Meta rejects that as a permanent failure, so "Resume" on exactly
        // the campaigns most likely to have partially failed (a media URL
        // issue) reliably failed all of them again.
        headerMediaUrl: campaign.headerMediaUrl || undefined,
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
      }
    );
  }

  return { success: true, retriedCount: campaign.recipients.length, message: `Resumed dispatch for ${campaign.recipients.length} pending messages.` };
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
