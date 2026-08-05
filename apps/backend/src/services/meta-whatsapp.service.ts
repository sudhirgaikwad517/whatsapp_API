import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { encryptToken, decryptToken } from '../utils/encryption.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { logger } from '../utils/logger.js';

export interface ConnectWhatsAppInput {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  accessToken: string;
}

/**
 * Save / Update WhatsApp Account credentials for a tenant.
 * Encrypts Meta Permanent System User Access Token before database write.
 */
export async function connectWhatsAppAccount(organizationId: string, input: ConnectWhatsAppInput) {
  // Find existing account for organization
  let waAccount = await prisma.whatsappAccount.findFirst({
    where: { organizationId, deletedAt: null },
  });

  const encryptedAccessToken = input.accessToken?.trim()
    ? encryptToken(input.accessToken.trim())
    : waAccount?.encryptedAccessToken;

  if (!encryptedAccessToken) {
    throw new AppError('Meta Access Token is required for initial setup.', 400, 'TOKEN_REQUIRED');
  }

  if (waAccount) {
    waAccount = await prisma.whatsappAccount.update({
      where: { id: waAccount.id },
      data: {
        wabaId: input.wabaId,
        phoneNumberId: input.phoneNumberId,
        displayPhoneNumber: input.displayPhoneNumber,
        encryptedAccessToken,
        status: 'CONNECTED',
      },
    });
  } else {
    waAccount = await prisma.whatsappAccount.create({
      data: {
        organizationId,
        wabaId: input.wabaId,
        phoneNumberId: input.phoneNumberId,
        displayPhoneNumber: input.displayPhoneNumber,
        encryptedAccessToken,
        webhookVerifyToken: env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
        status: 'CONNECTED',
      },
    });
  }

  logger.info({ organizationId, phoneNumberId: input.phoneNumberId }, 'WhatsApp Account connected successfully.');
  return {
    id: waAccount.id,
    wabaId: waAccount.wabaId,
    phoneNumberId: waAccount.phoneNumberId,
    displayPhoneNumber: waAccount.displayPhoneNumber,
    status: waAccount.status,
  };
}

/**
 * Fetch Meta Message Templates via Official Meta Graph API
 */
export async function syncMetaTemplates(organizationId: string) {
  const waAccount = await prisma.whatsappAccount.findFirst({
    where: { organizationId, deletedAt: null },
  });

  if (!waAccount) {
    throw new AppError('No WhatsApp account connected for this organization.', 404, 'NO_WHATSAPP_ACCOUNT');
  }

  const decryptedToken = decryptToken(waAccount.encryptedAccessToken);
  const url = `${env.META_GRAPH_BASE_URL}/${env.META_API_VERSION}/${waAccount.wabaId}/message_templates`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${decryptedToken}`,
    },
  });

  if (!response.ok) {
    const errBody = await response.json();
    logger.error({ errBody }, 'Failed to fetch templates from Meta Graph API');
    throw new AppError('Failed to fetch templates from Meta API.', 502, 'META_API_ERROR');
  }

  const metaData = (await response.json()) as { data: Array<any> };
  const fetchedMetaNames = metaData.data.map((t) => t.name);

  // Purge ALL templates in DB for this organization that no longer exist in Meta live account
  await prisma.template.deleteMany({
    where: {
      organizationId,
      name: { notIn: fetchedMetaNames.length ? fetchedMetaNames : ['__NONE__'] },
    },
  });

  // Upsert templates into database
  const syncedTemplates = [];
  for (const tpl of metaData.data) {
    const template = await prisma.template.upsert({
      where: {
        whatsappAccountId_name_language: {
          whatsappAccountId: waAccount.id,
          name: tpl.name,
          language: tpl.language,
        },
      },
      update: {
        metaTemplateId: tpl.id,
        category: tpl.category,
        status: tpl.status,
        components: tpl.components,
      },
      create: {
        organizationId,
        whatsappAccountId: waAccount.id,
        metaTemplateId: tpl.id,
        name: tpl.name,
        language: tpl.language,
        category: tpl.category,
        status: tpl.status,
        components: tpl.components,
      },
    });
    syncedTemplates.push(template);
  }

  return { syncedCount: syncedTemplates.length, templates: syncedTemplates };
}

/**
 * Send outbound text or template message via Official Meta Graph API
 */
export async function sendMetaOutboundMessage(
  organizationId: string,
  toPhoneNumber: string,
  messagePayload: { type: 'text' | 'template'; text?: string; template?: any }
) {
  const waAccount = await prisma.whatsappAccount.findFirst({
    where: { organizationId, deletedAt: null },
  });

  if (!waAccount) {
    throw new AppError('No active WhatsApp account connected for this organization.', 404, 'NO_WHATSAPP_ACCOUNT');
  }

  const decryptedToken = decryptToken(waAccount.encryptedAccessToken);
  const url = `${env.META_GRAPH_BASE_URL}/${env.META_API_VERSION}/${waAccount.phoneNumberId}/messages`;

  const digitsOnly = toPhoneNumber.replace(/\D/g, '');
  const cleanToPhone = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;

  const body: Record<string, any> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanToPhone,
    type: messagePayload.type,
  };

  if (messagePayload.type === 'text' && messagePayload.text) {
    body.text = { preview_url: false, body: messagePayload.text };
  } else if (messagePayload.type === 'template' && messagePayload.template) {
    body.template = messagePayload.template;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${decryptedToken}`,
    },
    body: JSON.stringify(body),
  });

  const resData = (await response.json()) as Record<string, any>;

  if (!response.ok) {
    logger.error({ resData, toPhoneNumber }, 'Meta Graph API message dispatch error');
    throw new AppError(
      resData.error?.message || 'Failed to send message via WhatsApp Meta API.',
      response.status,
      'META_MESSAGE_FAILED'
    );
  }

  const wamid = resData.messages?.[0]?.id;
  return { wamid, rawResponse: resData };
}

export async function getTemplates(organizationId: string) {
  return prisma.template.findMany({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' },
  });
}

/**
 * Meta Embedded Signup Flow handler:
 * Exchanges temporary OAuth code or session token for Permanent System User Access Token,
 * retrieves WABA ID & Phone Number ID from Meta Graph API, encrypts token, and saves connection.
 */
export async function processEmbeddedSignup(
  organizationId: string,
  input: { code?: string; wabaId: string; phoneNumberId: string; displayPhoneNumber: string; accessToken: string }
) {
  // Encrypt access token before storing
  const encryptedAccessToken = encryptToken(input.accessToken);

  const account = await prisma.whatsappAccount.upsert({
    where: { phoneNumberId: input.phoneNumberId },
    update: {
      wabaId: input.wabaId,
      displayPhoneNumber: input.displayPhoneNumber,
      encryptedAccessToken,
      status: 'CONNECTED',
    },
    create: {
      organizationId,
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      displayPhoneNumber: input.displayPhoneNumber,
      encryptedAccessToken,
      webhookVerifyToken: env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
      status: 'CONNECTED',
    },
  });

  // Automatically trigger Meta template sync upon onboarding
  try {
    await syncMetaTemplates(organizationId);
  } catch (err) {
    logger.warn({ err }, 'Initial template sync failed during embedded signup.');
  }

  return account;
}

export interface CreateTemplateInput {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language?: string;
  bodyText: string;
  headerType?: 'NONE' | 'TEXT' | 'IMAGE';
  headerText?: string;
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL';
    text: string;
    phoneNumber?: string;
    url?: string;
  }>;
}

export async function createMetaTemplate(organizationId: string, input: CreateTemplateInput) {
  const waAccount = await prisma.whatsappAccount.findFirst({
    where: { organizationId, deletedAt: null },
  });

  if (!waAccount) {
    throw new AppError('No WhatsApp account connected. Connect Meta WhatsApp account first in Settings.', 404, 'NO_WHATSAPP_ACCOUNT');
  }

  const cleanName = input.name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (!cleanName) {
    throw new AppError('Template name is required.', 400, 'INVALID_NAME');
  }
  if (!input.bodyText?.trim()) {
    throw new AppError('Template body text is required.', 400, 'INVALID_BODY');
  }

  const components: any[] = [];

  // Header component
  if (input.headerType === 'TEXT' && input.headerText?.trim()) {
    components.push({
      type: 'HEADER',
      format: 'TEXT',
      text: input.headerText.trim(),
    });
  } else if (input.headerType === 'IMAGE') {
    components.push({
      type: 'HEADER',
      format: 'IMAGE',
    });
  }

  // Body component
  components.push({
    type: 'BODY',
    text: input.bodyText.trim(),
  });

  // Buttons component
  if (input.buttons && input.buttons.length > 0) {
    components.push({
      type: 'BUTTONS',
      buttons: input.buttons.map((b) => {
        if (b.type === 'PHONE_NUMBER') {
          return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phoneNumber };
        }
        if (b.type === 'URL') {
          return { type: 'URL', text: b.text, url: b.url };
        }
        return { type: 'QUICK_REPLY', text: b.text };
      }),
    });
  }

  const payload = {
    name: cleanName,
    category: input.category || 'MARKETING',
    language: input.language || 'en_US',
    components,
  };

  const decryptedToken = decryptToken(waAccount.encryptedAccessToken);
  const url = `${env.META_GRAPH_BASE_URL}/${env.META_API_VERSION}/${waAccount.wabaId}/message_templates`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${decryptedToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseData = (await response.json()) as any;

  if (!response.ok) {
    logger.error({ responseData }, 'Failed to submit template to Meta Graph API');
    throw new AppError(
      responseData?.error?.message || 'Meta API rejected template creation request.',
      response.status || 400,
      'META_TEMPLATE_CREATE_ERROR'
    );
  }

  const template = await prisma.template.create({
    data: {
      organizationId,
      whatsappAccountId: waAccount.id,
      metaTemplateId: responseData.id || `tpl_${Date.now()}`,
      name: cleanName,
      category: payload.category,
      language: payload.language,
      status: responseData.status || 'PENDING',
      components,
    },
  });

  return template;
}
