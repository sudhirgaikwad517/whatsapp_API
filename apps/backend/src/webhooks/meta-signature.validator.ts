import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * Verifies the HMAC-SHA256 signature from Meta Webhook header.
 * Meta sends: X-Hub-Signature-256: sha256=<hex_digest>
 *
 * CRITICAL: rawBody must be the raw Buffer from express, NOT parsed JSON.
 * Set `express.json({ verify: ... })` to capture raw body.
 */
export function verifyMetaWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string
): boolean {
  // Allow dev bypass when using placeholder secret or in local development mode
  if (env.NODE_ENV === 'development' && (!signatureHeader || env.META_APP_SECRET.includes('your_meta_app_secret'))) {
    return true;
  }

  if (!signatureHeader) return false;

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') return false;

  const receivedSignature = parts[1];

  const expectedSignature = crypto
    .createHmac('sha256', env.META_APP_SECRET)
    .update(rawBody || Buffer.from(''))
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
    if (!isValid && env.NODE_ENV === 'development') {
      return true; // Soft fallback for local dev testing
    }
    return isValid;
  } catch {
    return env.NODE_ENV === 'development';
  }
}
