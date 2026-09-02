import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

vi.mock('../../src/config/env.js', () => ({
  env: {
    RAZORPAY_WEBHOOK_SECRET: 'razorpay_webhook_secret',
  },
}));

const mockFindFirst = vi.fn();
const mockCreate = vi.fn();
vi.mock('../../src/config/database.js', () => ({
  prisma: {
    invoice: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
      create: (...args: any[]) => mockCreate(...args),
    },
  },
}));

const mockRechargeWallet = vi.fn();
vi.mock('../../src/services/billing-wallet.service.js', () => ({
  rechargeWallet: (...args: any[]) => mockRechargeWallet(...args),
}));

const { processRazorpayWebhook } = await import('../../src/services/payment-webhook.service.js');

beforeEach(() => {
  mockFindFirst.mockReset().mockResolvedValue(null);
  mockCreate.mockReset().mockResolvedValue({});
  mockRechargeWallet.mockReset().mockResolvedValue({ availableBalance: { toString: () => '100' } });
});

describe('processRazorpayWebhook', () => {
  const secret = 'razorpay_webhook_secret';

  function buildPayload(organizationId: string | undefined) {
    return JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_abc',
            amount: 118000, // paise -> ₹1180
            currency: 'INR',
            notes: organizationId ? { organizationId } : {},
          },
        },
      },
    });
  }

  it('processes a validly signed event and credits the correct organization', async () => {
    const rawBody = buildPayload('org-123');
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const result = await processRazorpayWebhook(rawBody, signature);
    expect(result.success).toBe(true);
    expect(mockRechargeWallet).toHaveBeenCalledWith('org-123', expect.any(Number), 'pay_abc', expect.any(String));
  });

  it('rejects a tampered payload (signature no longer matches)', async () => {
    const rawBody = buildPayload('org-123');
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const tampered = rawBody.replace('118000', '999999999');

    await expect(processRazorpayWebhook(tampered, signature)).rejects.toThrow(/Invalid Razorpay Webhook HMAC Signature/);
    expect(mockRechargeWallet).not.toHaveBeenCalled();
  });

  it('rejects when organizationId is missing from payment notes — never guesses a tenant', async () => {
    const rawBody = buildPayload(undefined);
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    await expect(processRazorpayWebhook(rawBody, signature)).rejects.toThrow(/organizationId/);
    expect(mockRechargeWallet).not.toHaveBeenCalled();
  });
});
