import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ALGORITHM = 'aes-256-gcm';

function keyBufferFromHex(hex) {
  return Buffer.from((hex || '').padEnd(64, '0').slice(0, 64), 'hex');
}

function decryptWith(keyHex, cipherText) {
  const [ivHex, authTagHex, encryptedText] = cipherText.split(':');
  if (!ivHex || !authTagHex || !encryptedText) throw new Error('Malformed ciphertext');
  const key = keyBufferFromHex(keyHex);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  return decipher.update(encryptedText, 'hex', 'utf8') + decipher.final('utf8');
}

function encryptWith(keyHex, text) {
  const key = keyBufferFromHex(keyHex);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`;
}

/**
 * One-time key rotation: decrypts every encryptedAccessToken with OLD_ENCRYPTION_KEY
 * and re-encrypts it with the (new) ENCRYPTION_KEY currently in the environment.
 *
 * Usage:
 *   OLD_ENCRYPTION_KEY=<the-compromised-key> ENCRYPTION_KEY=<new-key> npm run rotate:encryption-key
 *
 * Plain JS (not TypeScript) on purpose — the production image has no `tsx`/TS
 * toolchain, only Node itself, and this script needs to run there directly.
 *
 * Dry-run by default — pass --apply to actually write changes.
 */
async function main() {
  const oldKey = process.env.OLD_ENCRYPTION_KEY;
  const newKey = process.env.ENCRYPTION_KEY;
  const apply = process.argv.includes('--apply');

  if (!oldKey) throw new Error('OLD_ENCRYPTION_KEY is required (the currently-live key being rotated away from).');
  if (!newKey) throw new Error('ENCRYPTION_KEY is required (the new key to re-encrypt with).');
  if (oldKey === newKey) throw new Error('OLD_ENCRYPTION_KEY and ENCRYPTION_KEY must differ.');

  const accounts = await prisma.whatsappAccount.findMany({
    where: { encryptedAccessToken: { not: null } },
    select: { id: true, encryptedAccessToken: true, displayPhoneNumber: true },
  });

  console.log(`Found ${accounts.length} WhatsApp account(s) with a stored access token.`);

  let ok = 0;
  let failed = 0;

  for (const acc of accounts) {
    try {
      const plain = decryptWith(oldKey, acc.encryptedAccessToken);
      const reEncrypted = encryptWith(newKey, plain);
      if (apply) {
        await prisma.whatsappAccount.update({
          where: { id: acc.id },
          data: { encryptedAccessToken: reEncrypted },
        });
      }
      ok++;
      console.log(`  [${apply ? 'rotated' : 'would rotate'}] ${acc.displayPhoneNumber || acc.id}`);
    } catch (err) {
      failed++;
      console.error(`  [FAILED] ${acc.displayPhoneNumber || acc.id}: ${err.message}`);
    }
  }

  console.log(`\n${apply ? 'Rotated' : 'Would rotate'} ${ok} account(s). ${failed} failed to decrypt with OLD_ENCRYPTION_KEY.`);
  if (!apply) {
    console.log('This was a DRY RUN. Re-run with --apply to write the changes.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Key rotation failed:', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
