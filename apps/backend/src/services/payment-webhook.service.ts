import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { rechargeWallet } from './billing-wallet.service.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { logger } from '../utils/logger.js';
import { sendMail, buildPurchaseConfirmationEmail } from '../utils/mailer.js';

async function sendPurchaseEmailToOwner(organizationId: string, description: string, amount: number, invoiceNumber: string) {
  try {
    const owner = await prisma.organizationMember.findFirst({
      where: { organizationId, role: 'BUSINESS_OWNER' },
      include: { user: { select: { fullName: true, email: true } } },
    });
    if (!owner) return;
    await sendMail({
      to: owner.user.email,
      subject: 'Payment Confirmation — Prowexa',
      html: buildPurchaseConfirmationEmail({ fullName: owner.user.fullName, description, amount, invoiceNumber }),
    });
  } catch (err) {
    logger.error({ organizationId, err }, 'Failed to send purchase confirmation email.');
  }
}

export async function processRazorpayWebhook(rawBody: string, signature: string) {
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new AppError('Razorpay webhook secret not configured on server.', 500, 'SERVER_MISCONFIGURATION');
  }

  // Verify HMAC SHA256 Signature — always, regardless of environment.
  const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  const expected = Buffer.from(expectedSignature, 'hex');
  const received = Buffer.from(signature || '', 'hex');
  const isValid = expected.length === received.length && crypto.timingSafeEqual(expected, received);

  if (!isValid) {
    throw new AppError('Invalid Razorpay Webhook HMAC Signature', 400, 'INVALID_SIGNATURE');
  }

  const payload = JSON.parse(rawBody);
  logger.info({ event: payload.event }, 'Received Razorpay Payment Webhook Event');

  if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
    const payment = payload.payload.payment.entity;
    const paymentId = payment.id;
    const amountPaid = payment.amount / 100; // Razorpay amounts are in paise
    const organizationId = payment.notes?.organizationId;

    if (!organizationId) {
      logger.error({ paymentId }, 'Razorpay webhook payment carries no organizationId in notes — rejecting rather than guessing a tenant.');
      throw new AppError('Payment notes missing organizationId; cannot attribute this payment to a tenant.', 400, 'MISSING_ORGANIZATION_ID');
    }

    // Idempotency Check: Prevent duplicate wallet recharges
    const existingInvoice = await prisma.invoice.findFirst({
      where: { paymentId },
    });

    if (existingInvoice) {
      logger.info({ paymentId }, 'Razorpay webhook already processed. Skipping duplicate.');
      return { success: true, processed: false, reason: 'ALREADY_PROCESSED' };
    }

    // Calculate subtotal & 18% GST tax
    const subtotal = Number((amountPaid / 1.18).toFixed(2));
    const taxAmount = Number((amountPaid - subtotal).toFixed(2));

    // Recharge Wallet
    const wallet = await rechargeWallet(
      organizationId,
      subtotal,
      paymentId,
      `Credits Purchased via Razorpay (${paymentId})`
    );

    // Generate Tax Invoice
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        invoiceNumber,
        description: 'Credits Purchased via Razorpay',
        subtotal: new Prisma.Decimal(subtotal),
        taxAmount: new Prisma.Decimal(taxAmount),
        grandTotal: new Prisma.Decimal(amountPaid),
        currency: payment.currency || 'INR',
        paymentId,
        gatewayName: 'RAZORPAY',
        status: 'PAID',
      },
    });

    logger.info(
      { organizationId, paymentId, invoiceNumber, amountPaid, walletBalance: wallet.availableBalance.toString() },
      '✅ Razorpay Payment Processed: Wallet Credited & Invoice Generated!'
    );

    void sendPurchaseEmailToOwner(organizationId, invoice.description!, amountPaid, invoiceNumber);

    return { success: true, invoice, wallet };
  }

  return { success: true, processed: false };
}

export async function getOrganizationInvoices(organizationId: string) {
  return prisma.invoice.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}
