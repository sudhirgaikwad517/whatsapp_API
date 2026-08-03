import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { rechargeWallet } from './billing-wallet.service.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { logger } from '../utils/logger.js';

export async function processRazorpayWebhook(rawBody: string, signature: string) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'prowexa_razorpay_secret_123';

  // Verify HMAC SHA256 Signature
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature && process.env.NODE_ENV === 'production') {
    throw new AppError('Invalid Razorpay Webhook HMAC Signature', 400, 'INVALID_SIGNATURE');
  }

  const payload = JSON.parse(rawBody);
  logger.info({ event: payload.event }, 'Received Razorpay Payment Webhook Event');

  if (payload.event === 'payment.captured' || payload.event === 'order.paid') {
    const payment = payload.payload.payment.entity;
    const paymentId = payment.id;
    const amountPaid = payment.amount / 100; // Razorpay amounts are in paise
    const organizationId = payment.notes?.organizationId || '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';

    // Calculate subtotal & 18% GST tax
    const subtotal = Number((amountPaid / 1.18).toFixed(2));
    const taxAmount = Number((amountPaid - subtotal).toFixed(2));

    // Recharge Wallet
    const wallet = await rechargeWallet(
      organizationId,
      subtotal,
      paymentId,
      `Razorpay Wallet Top-Up (${paymentId})`
    );

    // Generate Tax Invoice
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        invoiceNumber,
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

    return { success: true, invoice, wallet };
  }

  return { success: true, processed: false };
}

export async function processStripeWebhook(rawBody: string, signature: string) {
  const payload = JSON.parse(rawBody);
  logger.info({ event: payload.type }, 'Received Stripe Payment Webhook Event');

  if (payload.type === 'checkout.session.completed' || payload.type === 'payment_intent.succeeded') {
    const session = payload.data.object;
    const paymentId = session.id;
    const amountPaid = session.amount_total ? session.amount_total / 100 : session.amount / 100;
    const organizationId = session.metadata?.organizationId || '3139c8ac-9b48-4d35-ad70-b6ff8db7addb';

    const subtotal = Number((amountPaid / 1.18).toFixed(2));
    const taxAmount = Number((amountPaid - subtotal).toFixed(2));

    const wallet = await rechargeWallet(
      organizationId,
      subtotal,
      paymentId,
      `Stripe Wallet Top-Up (${paymentId})`
    );

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        invoiceNumber,
        subtotal: new Prisma.Decimal(subtotal),
        taxAmount: new Prisma.Decimal(taxAmount),
        grandTotal: new Prisma.Decimal(amountPaid),
        currency: session.currency?.toUpperCase() || 'INR',
        paymentId,
        gatewayName: 'STRIPE',
        status: 'PAID',
      },
    });

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
