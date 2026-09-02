import crypto from 'crypto';
import { env } from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';

function getKeyBuffer(): Buffer {
  const hex = (env.ENCRYPTION_KEY || '').padEnd(64, '0').slice(0, 64);
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt sensitive plain text string (e.g. Meta Permanent Access Token)
 */
export function encryptToken(text: string): string {
  const key = getKeyBuffer();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Return iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt ciphertext back to plain text
 */
export function decryptToken(cipherText: string): string {
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid cipher format for token decryption');
  }
  const [ivHex, authTagHex, encryptedText] = parts;
  const key = getKeyBuffer();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Like decryptToken, but tolerates values that were stored before a field
 * started being encrypted (or aren't in the iv:authTag:ciphertext format for
 * any other reason) by returning them as-is instead of throwing. Use this for
 * fields that transitioned from plaintext to encrypted-at-rest, so old rows
 * keep working until they're next written (and re-encrypted).
 */
export function safeDecryptToken(cipherText: string | null | undefined): string | null {
  if (!cipherText) return cipherText ?? null;
  try {
    return decryptToken(cipherText);
  } catch {
    return cipherText;
  }
}
