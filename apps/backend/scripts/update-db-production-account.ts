import { PrismaClient } from '@prisma/client';
import { syncMetaTemplates } from '../src/services/meta-whatsapp.service.js';

const prisma = new PrismaClient();

async function setRegisteredWaba() {
  const orgId = '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';

  const waAccount = await prisma.whatsappAccount.findFirst({
    where: { organizationId: orgId, deletedAt: null },
  });

  if (!waAccount) return;

  await prisma.whatsappAccount.update({
    where: { id: waAccount.id },
    data: {
      wabaId: '1062982949528502',
      phoneNumberId: '1302304886291943',
      displayPhoneNumber: '+917030347209',
      status: 'CONNECTED',
    },
  });

  console.log('✅ Updated Prowexa DB to use Registered WABA (1062982949528502) & Phone ID (1302304886291943)!');

  const syncRes = await syncMetaTemplates(orgId);
  console.log(`✅ Synced ${syncRes.syncedCount} templates for Registered WABA!`);
  for (const t of syncRes.templates) {
    console.log(`  - ${t.name} (${t.language}) [${t.status}]`);
  }
}

setRegisteredWaba().finally(() => prisma.$disconnect());
