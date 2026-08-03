import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAndCleanConversations() {
  const orgId = '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';

  const activeWa = await prisma.whatsappAccount.findFirst({
    where: { organizationId: orgId, deletedAt: null },
  });

  if (!activeWa) return;

  console.log(`Active WABA ID: ${activeWa.wabaId}`);
  console.log(`Active Account UUID: ${activeWa.id}`);

  // Count conversations for active whatsappAccountId vs other accounts
  const activeCount = await prisma.conversation.count({
    where: { organizationId: orgId, whatsappAccountId: activeWa.id },
  });

  const inactiveCount = await prisma.conversation.count({
    where: { organizationId: orgId, whatsappAccountId: { not: activeWa.id } },
  });

  console.log(`Conversations for Active Account (${activeWa.displayPhoneNumber}): ${activeCount}`);
  console.log(`Stale Conversations from Previous WABA Accounts: ${inactiveCount}`);

  if (inactiveCount > 0) {
    const deleted = await prisma.conversation.deleteMany({
      where: { organizationId: orgId, whatsappAccountId: { not: activeWa.id } },
    });
    console.log(`🧹 Deleted ${deleted.count} stale conversation threads from old WABA accounts!`);
  }
}

checkAndCleanConversations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
