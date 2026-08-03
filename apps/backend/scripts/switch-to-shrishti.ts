import { PrismaClient } from '@prisma/client';
import { syncMetaTemplates } from '../src/services/meta-whatsapp.service.js';

const prisma = new PrismaClient();

async function switchToShrishti() {
  const orgId = '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';

  console.log('🔄 Switching Prowexa Database to Shrishti Dairy Farm (WABA: 1622338879452408)...');

  const waAccount = await prisma.whatsappAccount.findFirst({
    where: { organizationId: orgId, deletedAt: null },
  });

  if (!waAccount) return;

  await prisma.whatsappAccount.update({
    where: { id: waAccount.id },
    data: {
      wabaId: '1622338879452408',
      phoneNumberId: '1230801043452072',
      displayPhoneNumber: '+919270320989',
      status: 'CONNECTED',
    },
  });

  console.log('✅ DB Account Updated to Shrishti Dairy Farm!');

  // Sync templates
  const syncRes = await syncMetaTemplates(orgId);
  console.log(`\n✅ Synced ${syncRes.syncedCount} templates for Shrishti Dairy Farm:`);
  for (const t of syncRes.templates) {
    console.log(`  - ${t.name} (${t.language}) [Status: ${t.status}]`);
  }
}

switchToShrishti()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
