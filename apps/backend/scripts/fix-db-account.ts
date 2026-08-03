import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  console.log('🔧 Cleaning up old WhatsappAccount records in Database...');

  // Delete all existing accounts
  await prisma.whatsappAccount.deleteMany({});

  // Fetch default org
  const org = await prisma.organization.findFirst({});

  if (!org) {
    console.error('No organization found!');
    return;
  }

  // Create single active account with live Meta credentials
  const account = await prisma.whatsappAccount.create({
    data: {
      organizationId: org.id,
      wabaId: '2251442372294214',
      phoneNumberId: '1181142285092556',
      displayPhoneNumber: '+1 (555) 667-7453',
      encryptedAccessToken: '0123456789abcdef:0123456789abcdef:0123456789abcdef',
      webhookVerifyToken: 'prowexa_whatsapp_webhook_secret_123',
      status: 'CONNECTED',
    },
  });

  console.log('✅ Clean single record created:', JSON.stringify(account, null, 2));
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
