import { PrismaClient } from '@prisma/client';
import { syncMetaTemplates } from '../src/services/meta-whatsapp.service.js';

const prisma = new PrismaClient();

async function runSync() {
  const orgId = '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';

  console.log('🔄 Executing Bulletproof Template Sync for Shrishti Dairy Farm...');

  const syncRes = await syncMetaTemplates(orgId);

  console.log(`\n✅ Synced ${syncRes.syncedCount} live templates from Meta:`);
  for (const t of syncRes.templates) {
    console.log(`  - Name: ${t.name} (${t.language}) [Status: ${t.status}]`);
  }

  const dbTemplates = await prisma.template.findMany({
    where: { organizationId: orgId },
  });

  console.log(`\n--- ALL TEMPLATES CURRENTLY IN DB (${dbTemplates.length}) ---`);
  for (const t of dbTemplates) {
    console.log(`  - ${t.name} (${t.language}) [${t.status}]`);
  }
}

runSync()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
