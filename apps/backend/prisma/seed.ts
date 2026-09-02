import crypto from 'crypto';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { encryptToken } from '../src/utils/encryption.js';

const prisma = new PrismaClient();
const rawAccessToken = 'EAAb8DuTtq3cBSDmPq4ZAaBnhb8srY5IlHWInhuroFmEAaRciQuWZAOqnLXcYeyqWoWsZB3dlkdeKL8OUGbhEZCaCldkFGLCRqn3xnjripv17ZAaVGyHORHnUfQ2Mo8A5iQrI8yZCWeuBEJw8u0SsZCHBpL8rukQWhRL3NEcOhB0clQ3KYSZCIgxgj4ZAvms2EnJf8FZBUZBghyL8S5qE2mfquOZBjhhoTcquhcOTDSqHMZAtey5A3ZCGqxgEX0JbnZBR4ww6NJ3cZAuy9VLjkakMkmCpZCwvE7QZDZD';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'This seed script creates demo/test data with a printed password and must never run against production. ' +
      'Use "npm run seed:superadmin" (env-driven, no demo data) for production super admin provisioning instead.'
    );
  }

  const encryptedAccessToken = encryptToken(rawAccessToken);
  const email = 'admin@prowexa.com';
  const plainPassword = process.env.SEED_PASSWORD || crypto.randomBytes(9).toString('base64url');

  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const org = await prisma.organization.upsert({
    where: { slug: 'prowexa-enterprise' },
    update: {},
    create: {
      name: 'Prowexa Enterprise',
      slug: 'prowexa-enterprise',
      timezone: 'Asia/Kolkata',
    },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { isEmailVerified: true },
    create: {
      email,
      fullName: 'Super Admin',
      passwordHash,
      isEmailVerified: true,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: UserRole.BUSINESS_OWNER,
    },
  });

  // Seed default connected WhatsApp Account for testing simulations
  const waAccount = await prisma.whatsappAccount.upsert({
    where: { phoneNumberId: '1181142285092556' },
    update: {
      wabaId: '2251442372294214',
      displayPhoneNumber: '+1 (555) 667-7453',
      encryptedAccessToken,
      status: 'CONNECTED',
    },
    create: {
      organizationId: org.id,
      wabaId: '2251442372294214',
      phoneNumberId: '1181142285092556',
      displayPhoneNumber: '+1 (555) 667-7453',
      encryptedAccessToken,
      webhookVerifyToken: 'prowexa_whatsapp_webhook_secret_123',
      status: 'CONNECTED',
    },
  });

  // Seed APPROVED templates for testing campaigns
  await prisma.template.upsert({
    where: {
      whatsappAccountId_name_language: {
        whatsappAccountId: waAccount.id,
        name: 'hello_world',
        language: 'en_US',
      },
    },
    update: { status: 'APPROVED' },
    create: {
      organizationId: org.id,
      whatsappAccountId: waAccount.id,
      metaTemplateId: 'tpl_hello_world_001',
      name: 'hello_world',
      language: 'en_US',
      category: 'UTILITY',
      status: 'APPROVED',
      components: [
        { type: 'BODY', text: 'Hello {{1}}, welcome to Prowexa WhatsApp Platform!' },
      ],
    },
  });

  await prisma.template.upsert({
    where: {
      whatsappAccountId_name_language: {
        whatsappAccountId: waAccount.id,
        name: 'dairy_sale_promo',
        language: 'en_US',
      },
    },
    update: { status: 'APPROVED' },
    create: {
      organizationId: org.id,
      whatsappAccountId: waAccount.id,
      metaTemplateId: 'tpl_dairy_sale_002',
      name: 'dairy_sale_promo',
      language: 'en_US',
      category: 'MARKETING',
      status: 'APPROVED',
      components: [
        { type: 'BODY', text: 'Special Dairy Sale! Get 20% off on all products.' },
      ],
    },
  });

  console.log('✅ Seed successful! (development/demo data only)');
  console.log('──────────────────────────────────────');
  console.log('Admin Email:      admin@prowexa.com');
  console.log(`Admin Password:   ${plainPassword}`);
  console.log('(Run "npm run seed:superadmin" separately to provision a Super Admin account.)');
  console.log('Org:              Prowexa Enterprise');
  console.log('Role:             SUPER_ADMIN / BUSINESS_OWNER');
  console.log('App ID:           1965990760786807');
  console.log('WABA ID:          2251442372294214');
  console.log('Phone ID:         1181142285092556');
  console.log('Test Number:      +1 (555) 667-7453');
  console.log('Verify Token:     prowexa_whatsapp_webhook_secret_123');
  console.log('──────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
