import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function wipeTestConversations() {
  const orgId = '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';

  console.log('🧹 Purging test conversations and messages to ensure a 100% fresh Inbox for Shrishti Dairy Farm...');

  const deletedConvs = await prisma.conversation.deleteMany({
    where: { organizationId: orgId },
  });

  console.log(`✅ Deleted ${deletedConvs.count} test conversation thread(s) and associated messages!`);
  console.log('✨ Live Inbox is now 100% NEAT, CLEAN & CONFLICT-FREE!');
}

wipeTestConversations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
