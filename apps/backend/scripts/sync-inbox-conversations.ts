import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function sync() {
  console.log('🔄 Syncing contacts & conversations for Live Inbox...');

  const org = await prisma.organization.findFirst({});
  const waAccount = await prisma.whatsappAccount.findFirst({ where: { status: 'CONNECTED' } });

  if (!org || !waAccount) {
    console.error('Missing organization or active WhatsApp account');
    return;
  }

  // Create or update contact Sudhir Gaikwad (+917666130611)
  let contact = await prisma.contact.findFirst({
    where: {
      organizationId: org.id,
      phoneNumber: { in: ['+917666130611', '917666130611'] },
    },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        organizationId: org.id,
        phoneNumber: '+917666130611',
        firstName: 'Sudhir',
        lastName: 'Gaikwad',
        isOptedIn: true,
      },
    });
  }

  // Create or update conversation for Live Inbox
  const windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const conversation = await prisma.conversation.upsert({
    where: {
      whatsappAccountId_contactId: {
        whatsappAccountId: waAccount.id,
        contactId: contact.id,
      },
    },
    update: {
      status: 'OPEN',
      windowExpiresAt,
      lastMessageSnippet: 'Hello! Live chat connected.',
      lastMessageAt: new Date(),
    },
    create: {
      organizationId: org.id,
      whatsappAccountId: waAccount.id,
      contactId: contact.id,
      status: 'OPEN',
      windowExpiresAt,
      lastMessageSnippet: 'Hello! Live chat connected.',
      lastMessageAt: new Date(),
    },
  });

  // Create initial message if none exists
  const existingMsg = await prisma.message.findFirst({ where: { conversationId: conversation.id } });
  if (!existingMsg) {
    await prisma.message.create({
      data: {
        organizationId: org.id,
        conversationId: conversation.id,
        wamid: `wamid.initial_${Date.now()}`,
        direction: 'INBOUND',
        type: 'TEXT',
        content: { text: 'Hello! Ready for live WhatsApp chat.' },
        status: 'DELIVERED',
        sentAt: new Date(),
      },
    });
  }

  console.log(`✅ Clean Conversation created for contact ${contact.firstName} (${contact.phoneNumber}): ${conversation.id}`);
}

sync()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
