import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Idempotent, env-driven Super Admin provisioning.
 *
 * Unlike the old login-time auto-seed (removed — it created an account with a
 * hardcoded password on first login), this script only ever runs when you
 * invoke it explicitly, and only ever creates/updates the exact email you
 * point it at, with a password you supply.
 *
 * Usage:
 *   SUPERADMIN_EMAIL=you@company.com SUPERADMIN_PASSWORD='a-real-strong-password' npm run seed:superadmin
 *
 * Plain JS (not TypeScript) on purpose — the production image has no `tsx`/TS
 * toolchain, only Node itself, and this script needs to run there directly.
 */
async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;
  const fullName = process.env.SUPERADMIN_NAME || 'Platform Administrator';

  if (!email) {
    throw new Error('SUPERADMIN_EMAIL is required.');
  }
  if (!password || password.length < 12) {
    throw new Error('SUPERADMIN_PASSWORD is required and must be at least 12 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await prisma.superAdminUser.findUnique({ where: { email } });

  const admin = await prisma.superAdminUser.upsert({
    where: { email },
    update: { passwordHash, isActive: true, fullName },
    create: {
      email,
      fullName,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log(existing ? '✅ Super Admin password rotated.' : '✅ Super Admin account created.');
  console.log(`   Email: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Super Admin seed failed:', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
