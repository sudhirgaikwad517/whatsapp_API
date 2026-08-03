import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentDbWaba() {
  const orgId = '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';

  const waAccount = await prisma.whatsappAccount.findFirst({
    where: { organizationId: orgId, deletedAt: null },
  });

  if (!waAccount) {
    console.log('No WhatsApp Account found');
    return;
  }

  console.log(`Current DB WABA ID: ${waAccount.wabaId}`);
  console.log(`Current DB Phone Number ID: ${waAccount.phoneNumberId}`);
  console.log(`Current DB Display Phone: ${waAccount.displayPhoneNumber}`);
}

checkCurrentDbWaba().finally(() => prisma.$disconnect());
