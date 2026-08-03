import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      memberships: { select: { organizationId: true, role: true } },
    },
  });
  const orgs = await prisma.organization.findMany({});
  const waAccounts = await prisma.whatsappAccount.findMany({});
  const contacts = await prisma.contact.findMany({});
  const conversations = await prisma.conversation.findMany({});

  console.log('--- USERS ---');
  console.log(JSON.stringify(users, null, 2));

  console.log('--- ORGS ---');
  console.log(JSON.stringify(orgs, null, 2));

  console.log('--- WHATSAPP ACCOUNTS ---');
  console.log(JSON.stringify(waAccounts.map(a => ({ id: a.id, orgId: a.organizationId, phoneId: a.phoneNumberId, status: a.status })), null, 2));

  console.log('--- CONTACTS ---');
  console.log(JSON.stringify(contacts.map(c => ({ id: c.id, orgId: c.organizationId, phone: c.phoneNumber })), null, 2));

  console.log('--- CONVERSATIONS ---');
  console.log(JSON.stringify(conversations.map(c => ({ id: c.id, orgId: c.organizationId, contactId: c.contactId, status: c.status })), null, 2));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
