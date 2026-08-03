import { PrismaClient } from '@prisma/client';
import { decryptToken } from '../src/utils/encryption.js';

const prisma = new PrismaClient();

async function checkAndClean() {
  console.log('🔍 Inspecting Active WhatsApp Account and Templates in DB...');

  const orgId = '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';

  const waAccount = await prisma.whatsappAccount.findFirst({
    where: { organizationId: orgId, deletedAt: null },
  });

  if (!waAccount) {
    console.log('No active account found');
    return;
  }

  console.log(`Active WABA ID in DB: ${waAccount.wabaId}`);
  console.log(`Active Phone Number ID in DB: ${waAccount.phoneNumberId}`);

  const token = decryptToken(waAccount.encryptedAccessToken);

  // Query Meta API live
  const url = `https://graph.facebook.com/v26.0/${waAccount.wabaId}/message_templates?access_token=${token}`;
  const res = await fetch(url);
  const json = await res.json();

  if (json.data) {
    console.log(`\nMeta API Live Templates Count for WABA ${waAccount.wabaId}: ${json.data.length}`);
    for (const t of json.data) {
      console.log(`  - ${t.name} (${t.language}) [Status: ${t.status}]`);
    }

    // Clean up templates in DB that don't belong to this active whatsappAccountId
    const deleted = await prisma.template.deleteMany({
      where: {
        organizationId: orgId,
        whatsappAccountId: { not: waAccount.id },
      },
    });

    console.log(`\n🧹 Cleaned up ${deleted.count} stale test template(s) from other WABA accounts.`);

    // Upsert live templates from active WABA
    for (const item of json.data) {
      await prisma.template.upsert({
        where: {
          whatsappAccountId_name_language: {
            whatsappAccountId: waAccount.id,
            name: item.name,
            language: item.language,
          },
        },
        update: {
          metaTemplateId: item.id,
          category: item.category,
          status: item.status,
          components: item.components,
        },
        create: {
          organizationId: orgId,
          whatsappAccountId: waAccount.id,
          metaTemplateId: item.id,
          name: item.name,
          language: item.language,
          category: item.category,
          status: item.status,
          components: item.components,
        },
      });
    }

    console.log('✅ DB synced with active WABA templates only!');
  } else {
    console.error('Meta API Error:', json.error?.message);
  }
}

checkAndClean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
