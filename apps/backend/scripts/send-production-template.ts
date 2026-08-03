import { PrismaClient } from '@prisma/client';
import { sendMetaOutboundMessage } from '../src/services/meta-whatsapp.service.js';

const prisma = new PrismaClient();

async function sendProductionTemplate() {
  console.log('🚀 Sending approved template "hello_world" from Production Number (+91 70303 47209) to +917666130611...');

  const orgId = '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';

  try {
    const res = await sendMetaOutboundMessage(orgId, '+917666130611', {
      type: 'template',
      template: {
        name: 'hello_world',
        language: { code: 'en_US' },
      },
    });

    console.log(`✅ TEMPLATE DISPATCH SUCCESSFUL! WAMID: ${res.wamid}`);
  } catch (err: any) {
    console.error(`Dispatch failed: ${err.message}`);
  }
}

sendProductionTemplate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
