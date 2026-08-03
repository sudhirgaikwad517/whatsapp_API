import { PrismaClient } from '@prisma/client';
import { decryptToken } from '../src/utils/encryption.js';

const prisma = new PrismaClient();

async function checkAllWabas() {
  const waAccount = await prisma.whatsappAccount.findFirst({
    where: { organizationId: '3139c8ac-9b48-4d35-ad70-b6ff8db7addb', deletedAt: null },
  });

  if (!waAccount) return;

  const token = decryptToken(waAccount.encryptedAccessToken);

  const wabas = ['1062982949528502', '1555797152935110', '2251442372294214'];

  for (const wabaId of wabas) {
    console.log(`\n🔍 Checking templates for WABA ID: ${wabaId}...`);
    try {
      const url = `https://graph.facebook.com/v26.0/${wabaId}/message_templates?access_token=${token}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.data) {
        console.log(`Found ${json.data.length} templates:`);
        for (const item of json.data) {
          console.log(`  - ${item.name} (${item.language}) [${item.status}]`);
        }
      } else {
        console.log('Error:', json.error?.message);
      }
    } catch (e: any) {
      console.error(e.message);
    }
  }
}

checkAllWabas().finally(() => prisma.$disconnect());
