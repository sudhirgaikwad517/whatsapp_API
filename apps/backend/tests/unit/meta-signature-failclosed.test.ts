import { describe, it, expect, vi } from 'vitest';

describe('Meta webhook signature — unconfigured secret behavior', () => {
  it('fails CLOSED (rejects) when META_APP_SECRET is unset in production', async () => {
    vi.resetModules();
    vi.doMock('../../src/config/env.js', () => ({
      env: { META_APP_SECRET: '', NODE_ENV: 'production' },
    }));
    const { verifyMetaWebhookSignature } = await import('../../src/webhooks/meta-signature.validator.js');
    expect(verifyMetaWebhookSignature(Buffer.from('{}'), 'sha256=whatever')).toBe(false);
  });

  it('fails open (allows) when META_APP_SECRET is unset outside production — dev convenience only', async () => {
    vi.resetModules();
    vi.doMock('../../src/config/env.js', () => ({
      env: { META_APP_SECRET: '', NODE_ENV: 'development' },
    }));
    const { verifyMetaWebhookSignature } = await import('../../src/webhooks/meta-signature.validator.js');
    expect(verifyMetaWebhookSignature(Buffer.from('{}'), '')).toBe(true);
  });
});
