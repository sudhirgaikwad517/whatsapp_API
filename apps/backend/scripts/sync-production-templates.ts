import { PrismaClient } from '@prisma/client';
import { syncMetaTemplates } from '../src/services/meta-whatsapp.service.js';

const prisma = new PrismaClient();

async function syncProduction() {
  console.log('🔄 Syncing Meta Templates for Production WABA (+91 70303 47209)...');

  const orgId = '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';
  try {
    const res = await syncMetaTemplates(orgId);
    console.log(`✅ Synced ${res.syncedCount} production templates!`);
    for (const t of res.templates) {
      console.log(`  Template: ${t.name} (${t.language}) [${t.status}]`);
    }
  } catch (err: any) {
    console.error(`Sync error: ${err.message}`);
  }
}

syncProduction()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
