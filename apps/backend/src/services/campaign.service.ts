import { prisma } from '../config/database.js';
import { marketingQueue } from '../queues/index.js';
import { AppError } from '../middlewares/error-handler.middleware.js';

export interface CreateCampaignInput {
  name: string;
  templateId: string;
  headerMediaUrl?: string;
  scheduledAt?: string;
  tagIds?: string[];
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

  // Select target audience based on tags
  const contactWhere: any = { organizationId, deletedAt: null, NOT: { isOptedIn: false } };
  if (input.tagIds?.length) {
    contactWhere.tags = { some: { tagId: { in: input.tagIds } } };
  }

  const targetContacts = await prisma.contact.findMany({
    where: contactWhere,
    select: { id: true, phoneNumber: true },
  });

  if (!targetContacts.length) {
    throw new AppError('No eligible opted-in contacts found for the selected campaign audience.', 400, 'NO_TARGET_CONTACTS');
  }

  // Create campaign record
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

  return prisma.campaign.findMany({
    where: {
      organizationId,
      ...(activeWa ? { template: { whatsappAccountId: activeWa.id } } : {}),
    },
    include: { template: { select: { id: true, name: true, category: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getCampaignAnalytics(organizationId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, organizationId },
    include: {
      template: true,
      recipients: {
        include: { contact: { select: { id: true, phoneNumber: true, firstName: true } } },
      },
    },
  });

  if (!campaign) throw new AppError('Campaign not found.', 404, 'CAMPAIGN_NOT_FOUND');

  return campaign;
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
