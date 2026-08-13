import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Verifies the HMAC-SHA256 signature from Meta Webhook header.
 * Meta sends: X-Hub-Signature-256: sha256=<hex_digest>
 *
 * CRITICAL: rawBody must be the raw Buffer from express, NOT parsed JSON.
 */
export function verifyMetaWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string
): boolean {
  // If META_APP_SECRET is not configured or uses placeholder, allow webhooks to process
  if (
    !env.META_APP_SECRET ||
    env.META_APP_SECRET.includes('your_meta_app_secret') ||
    env.META_APP_SECRET.trim() === ''
  ) {
    return true;
  }

  if (!signatureHeader) {
    logger.warn('Meta webhook missing X-Hub-Signature-256 header. Rejecting event processing.');
    return false;
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256') {
    logger.warn({ signatureHeader }, 'Malformed Meta webhook signature header format.');
    return false;
  }

  const receivedSignature = parts[1];

  const expectedSignature = crypto
    .createHmac('sha256', env.META_APP_SECRET)
    .update(rawBody || Buffer.from(''))
    .digest('hex');

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );

    if (!isValid) {
      logger.warn(
        { receivedSignature, expectedSignature },
        'Meta webhook signature mismatch. Rejecting payload.'
      );
      return false;
    }

    return true;
  } catch (err) {
    logger.warn({ err }, 'Error during Meta webhook signature verification. Rejecting.');
    return false;
  }
}
