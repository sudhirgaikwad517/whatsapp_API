import { prisma } from '../config/database.js';
import { sendMetaOutboundMessage } from './meta-whatsapp.service.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { env } from '../config/env.js';

export async function listConversations(
  organizationId: string,
  options: { status?: string; assignedAgentId?: string; contactId?: string; search?: string; page?: number; limit?: number }
) {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const skip = (page - 1) * limit;

  const activeAccount = await prisma.whatsappAccount.findFirst({
    where: { organizationId, deletedAt: null },
  });

  if (options.contactId && activeAccount) {
    try {
      await prisma.conversation.upsert({
        where: {
          whatsappAccountId_contactId: {
            whatsappAccountId: activeAccount.id,
            contactId: options.contactId,
          },
        },
        update: {},
        create: {
          organizationId,
          whatsappAccountId: activeAccount.id,
          contactId: options.contactId,
          status: 'OPEN',
        },
      });
    } catch {
      // Ignore conflict
    }
  }

  if (activeAccount) {
    try {
      const existingConvContacts = await prisma.conversation.findMany({
        where: { whatsappAccountId: activeAccount.id },
        select: { contactId: true },
      });
      const existingIds = new Set(existingConvContacts.map((c) => c.contactId));

      const unlinkedContacts = await prisma.contact.findMany({
        where: {
          organizationId,
          id: { notIn: Array.from(existingIds) },
        },
        select: { id: true },
        take: 200,
      });

      if (unlinkedContacts.length > 0) {
        await prisma.conversation.createMany({
          data: unlinkedContacts.map((c) => ({
            organizationId,
            whatsappAccountId: activeAccount.id,
            contactId: c.id,
            status: 'OPEN',
          })),
          skipDuplicates: true,
        });
      }
    } catch {
      // Ignore background sync errors
    }
  }

  const where: any = { organizationId };
  if (options.status) where.status = options.status;
  if (options.assignedAgentId) where.assignedAgentId = options.assignedAgentId;

  if (options.search && options.search.trim()) {
    const s = options.search.trim();
    where.contact = {
      OR: [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { phoneNumber: { contains: s } },
      ],
    };
  }

  const [total, conversations] = await Promise.all([
    prisma.conversation.count({ where }),
    prisma.conversation.findMany({
      where,
      skip,
      take: limit,
      include: {
        contact: true,
        assignedAgent: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    }),
  ]);

  return { conversations, total, page, limit };
}

export async function getConversationMessages(conversationId: string, organizationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: {
      contact: true,
      assignedAgent: {
        select: { id: true, fullName: true, email: true },
      },
    },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');

  // Reset unread count when agent opens conversation
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { unreadCount: 0 },
  });

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });

  return { conversation, messages };
}

export async function sendOutboundTextMessage(
  organizationId: string,
  conversationId: string,
  text: string
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: { contact: true },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');

  // Check 24-hour service window expiry for free-form customer text messages (enforced in production)
  if (env.NODE_ENV === 'production' && conversation.windowExpiresAt && conversation.windowExpiresAt < new Date()) {
    throw new AppError(
      'The 24-hour customer service window has expired. You must use an approved WhatsApp Template message to re-engage this contact.',
      400,
      'SERVICE_WINDOW_EXPIRED'
    );
  }

  // Send via Meta Graph API
  const metaRes = await sendMetaOutboundMessage(organizationId, conversation.contact.phoneNumber, {
    type: 'text',
    text,
  });

  // Save to database
  const message = await prisma.message.create({
    data: {
      organizationId,
      conversationId,
      wamid: metaRes.wamid,
      direction: 'OUTBOUND',
      type: 'TEXT',
      content: { text },
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  // Update conversation last snippet, 24h window expiry, and first response time (FRT)
  const extendedWindow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const frtMs = (!(conversation as any).firstResponseTimeMs && conversation.createdAt)
    ? Math.max(0, Date.now() - new Date(conversation.createdAt).getTime())
    : undefined;

  await (prisma as any).conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageSnippet: text.slice(0, 100),
      lastMessageAt: new Date(),
      windowExpiresAt: extendedWindow,
      ...(frtMs !== undefined ? { firstResponseTimeMs: frtMs } : {}),
    },
  });

  return message;
}

export async function assignConversation(organizationId: string, conversationId: string, agentId: string | null) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      assignedAgentId: agentId,
      ...(agentId === null && conversation.status === 'ESCALATED' ? { status: 'OPEN' } : {}),
    },
    include: { assignedAgent: { select: { id: true, fullName: true, email: true } } },
  });

  return updated;
}

export async function updateConversationStatus(organizationId: string, conversationId: string, status: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');

  const isResolved = status === 'CLOSED' || status === 'RESOLVED';

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status,
      ...(isResolved ? { resolvedAt: new Date(), assignedAgentId: null } : {}),
    },
  });

  try {
    const { emitToOrganization } = await import('../socket/inbox.gateway.js');
    emitToOrganization(organizationId, 'new_message', { conversationId });
  } catch (err) {
    // Ignore socket error
  }

  return updated;
}

export async function addInternalNote(organizationId: string, conversationId: string, authorId: string, content: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');

  const note = await prisma.internalNote.create({
    data: {
      conversationId,
      authorId,
      content,
    },
    include: { author: { select: { id: true, fullName: true, email: true } } },
  });

  return note;
}

export async function getInternalNotes(conversationId: string, organizationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');

  return prisma.internalNote.findMany({
    where: { conversationId },
    include: {
      author: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function sendOutboundTemplateMessage(
  organizationId: string,
  conversationId: string,
  templateName: string,
  language: string = 'en_US',
  components: any[] = []
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: { contact: true },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');

  // Send via Meta Graph API
  const templatePayload = {
    name: templateName,
    language: { code: language },
    components: components.length ? components : undefined,
  };

  const metaRes = await sendMetaOutboundMessage(organizationId, conversation.contact.phoneNumber, {
    type: 'template',
    template: templatePayload,
  });

  // Save to database
  const message = await prisma.message.create({
    data: {
      organizationId,
      conversationId,
      wamid: metaRes.wamid,
      direction: 'OUTBOUND',
      type: 'TEMPLATE',
      content: { templateName, components },
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  // Update conversation last snippet & extend window expiry by 24h
  const extendedWindow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageSnippet: `[Template: ${templateName}]`,
      lastMessageAt: new Date(),
      windowExpiresAt: extendedWindow,
    },
  });

  return message;
}

export async function sendOutboundMediaMessage(
  organizationId: string,
  conversationId: string,
  mediaPayload: { type: 'IMAGE' | 'DOCUMENT' | 'AUDIO' | 'VIDEO'; mediaUrl: string; filename?: string; caption?: string }
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId },
    include: { contact: true },
  });

  if (!conversation) throw new AppError('Conversation not found.', 404, 'CONVERSATION_NOT_FOUND');

  const extendedWindow = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const message = await prisma.message.create({
    data: {
      organizationId,
      conversationId,
      wamid: `wamid.outbound_media_${Date.now()}`,
      direction: 'OUTBOUND',
      type: mediaPayload.type,
      content: {
        mediaUrl: mediaPayload.mediaUrl,
        filename: mediaPayload.filename,
        caption: mediaPayload.caption,
      },
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageSnippet: `[${mediaPayload.type}] ${mediaPayload.filename || ''}`.trim(),
      lastMessageAt: new Date(),
      windowExpiresAt: extendedWindow,
    },
  });

  return message;
}

