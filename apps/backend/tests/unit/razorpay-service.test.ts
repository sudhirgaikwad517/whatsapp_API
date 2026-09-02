import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

vi.mock('../../src/config/env.js', () => ({
  env: {
    RAZORPAY_KEY_ID: 'rzp_test_key',
    RAZORPAY_KEY_SECRET: 'test_secret_abc123',
  },
}));

const mockGet = vi.fn();
vi.mock('axios', () => ({
  default: { get: (...args: any[]) => mockGet(...args) },
}));

const { verifyRazorpaySignature, verifyAndFetchCapturedAmount } = await import('../../src/services/razorpay.service.js');

function sign(orderId: string, paymentId: string, secret = 'test_secret_abc123') {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

describe('verifyRazorpaySignature', () => {
  it('accepts a correctly signed order/payment pair', () => {
    const signature = sign('order_1', 'pay_1');
    expect(() => verifyRazorpaySignature('order_1', 'pay_1', signature)).not.toThrow();
  });

  it('rejects a tampered signature', () => {
    const signature = sign('order_1', 'pay_1');
    expect(() => verifyRazorpaySignature('order_1', 'pay_2', signature)).toThrow(/Invalid payment signature/);
  });

  it('rejects a signature signed with the wrong secret', () => {
    const signature = sign('order_1', 'pay_1', 'wrong_secret');
    expect(() => verifyRazorpaySignature('order_1', 'pay_1', signature)).toThrow(/Invalid payment signature/);
  });
});

describe('verifyAndFetchCapturedAmount', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('returns the gateway-confirmed amount (in rupees) for a captured payment on the right order', async () => {
    const signature = sign('order_1', 'pay_1');
    mockGet.mockResolvedValueOnce({
      data: { id: 'pay_1', order_id: 'order_1', status: 'captured', amount: 350000, currency: 'INR' },
    });

    const amount = await verifyAndFetchCapturedAmount('order_1', 'pay_1', signature);
    expect(amount).toBe(3500);
  });

  it('rejects — never uses a client-supplied amount, only the gateway-confirmed one — when the payment belongs to a different order', async () => {
    const signature = sign('order_1', 'pay_1');
    mockGet.mockResolvedValueOnce({
      data: { id: 'pay_1', order_id: 'order_OTHER', status: 'captured', amount: 350000, currency: 'INR' },
    });

    await expect(verifyAndFetchCapturedAmount('order_1', 'pay_1', signature)).rejects.toThrow(/does not belong to the claimed order/);
  });

  it('rejects a payment that has not actually been captured', async () => {
    const signature = sign('order_1', 'pay_1');
    mockGet.mockResolvedValueOnce({
      data: { id: 'pay_1', order_id: 'order_1', status: 'authorized', amount: 350000, currency: 'INR' },
    });

    await expect(verifyAndFetchCapturedAmount('order_1', 'pay_1', signature)).rejects.toThrow(/has not been captured/);
  });

  it('rejects before ever calling Razorpay if the signature itself is invalid', async () => {
    await expect(verifyAndFetchCapturedAmount('order_1', 'pay_1', 'bogus')).rejects.toThrow(/Invalid payment signature/);
    expect(mockGet).not.toHaveBeenCalled();
  });
});
