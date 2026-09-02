import crypto from 'crypto';
import axios from 'axios';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.middleware.js';

/**
 * Verifies the HMAC-SHA256 signature Razorpay's client-side checkout returns
 * alongside a payment. This proves the payment/order pair is genuine, but it
 * does NOT prove the amount the client is reporting — that must always be
 * re-fetched from Razorpay itself via fetchRazorpayPayment().
 */
export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): void {
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new AppError('Razorpay secret key not configured on server.', 500, 'SERVER_MISCONFIGURATION');
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expected = Buffer.from(expectedSignature, 'hex');
  const received = Buffer.from(signature || '', 'hex');

  const isValid =
    expected.length === received.length && crypto.timingSafeEqual(expected, received);

  if (!isValid) {
    throw new AppError('Invalid payment signature. Payment rejected.', 400, 'INVALID_SIGNATURE');
  }
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  status: string;
  amount: number; // paise
  currency: string;
}

/**
 * Fetches the authoritative payment record directly from Razorpay's API.
 * Never trust a client-supplied amount for crediting a wallet/plan/credits —
 * always read the confirmed amount from here.
 */
export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new AppError('Razorpay credentials not configured on server.', 500, 'SERVER_MISCONFIGURATION');
  }

  const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  try {
    const res = await axios.get<RazorpayPayment>(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${authHeader}` },
      timeout: 8000,
    });
    return res.data;
  } catch (err: any) {
    throw new AppError(
      `Unable to verify payment with Razorpay: ${err.response?.data?.error?.description || err.message}`,
      502,
      'RAZORPAY_VERIFICATION_FAILED'
    );
  }
}

/**
 * Verifies signature + fetches the gateway-confirmed payment, asserting it is
 * captured and belongs to the claimed order. Returns the confirmed amount in
 * rupees (Razorpay reports paise).
 */
export async function verifyAndFetchCapturedAmount(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<number> {
  verifyRazorpaySignature(orderId, paymentId, signature);

  const payment = await fetchRazorpayPayment(paymentId);

  if (payment.order_id !== orderId) {
    throw new AppError('Payment does not belong to the claimed order.', 400, 'ORDER_MISMATCH');
  }
  if (payment.status !== 'captured') {
    throw new AppError(`Payment has not been captured (status: ${payment.status}).`, 400, 'PAYMENT_NOT_CAPTURED');
  }

  return payment.amount / 100;
}
