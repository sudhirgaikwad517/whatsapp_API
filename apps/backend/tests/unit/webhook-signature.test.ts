import { describe, it, expect } from 'vitest';
import { verifyMetaWebhookSignature } from '../../src/webhooks/meta-signature.validator.js';
import crypto from 'crypto';

vi.mock('../../src/config/env.js', () => ({
  env: {
    META_APP_SECRET: 'test_app_secret_12345',
  },
}));

describe('Meta Webhook HMAC Signature Validator', () => {
  const appSecret = 'test_app_secret_12345';

  function buildSignedPayload(body: object) {
    const rawBody = Buffer.from(JSON.stringify(body));
    const signature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    return { rawBody, signatureHeader: `sha256=${signature}` };
  }

  it('should return true for valid HMAC signature', () => {
    const { rawBody, signatureHeader } = buildSignedPayload({ object: 'whatsapp_business_account' });
    expect(verifyMetaWebhookSignature(rawBody, signatureHeader)).toBe(true);
  });

  it('should return false for tampered payload', () => {
    const { signatureHeader } = buildSignedPayload({ object: 'whatsapp_business_account' });
    const tamperedBody = Buffer.from('{"object":"tampered"}');
    expect(verifyMetaWebhookSignature(tamperedBody, signatureHeader)).toBe(false);
  });

  it('should return false for missing signature header', () => {
    const rawBody = Buffer.from('{}');
    expect(verifyMetaWebhookSignature(rawBody, '')).toBe(false);
  });

  it('should return false for wrong algorithm prefix', () => {
    const rawBody = Buffer.from('{}');
    const sig = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    expect(verifyMetaWebhookSignature(rawBody, `sha1=${sig}`)).toBe(false);
  });
});
