import crypto from 'crypto';
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
    const purpose = payment.notes?.purpose;

    if (!organizationId) {
      // Permanent condition — this payment will never gain an organizationId on
      // retry, so acknowledge with 200 instead of throwing. Throwing here made
      // Razorpay retry the same webhook indefinitely, flooding the logs.
      logger.error({ paymentId }, 'Razorpay webhook payment carries no organizationId in notes — rejecting rather than guessing a tenant.');
      return { success: true, processed: false, reason: 'MISSING_ORGANIZATION_ID' };
    }

    // This fallback only knows how to credit a wallet recharge — AI-credits
    // and plan purchases have their own gateway-amount-tier/plan-quote logic
    // that lives in billing.controller.ts and isn't safe to duplicate here
    // from notes alone. Those purposes still rely on the client-side
    // confirmation call completing; only 'wallet' purchases get this
    // server-side fallback for now.
    if (purpose && purpose !== 'wallet') {
      logger.warn({ paymentId, purpose }, 'Razorpay webhook received a captured payment for a purpose this fallback does not handle — skipping.');
      return { success: true, processed: false, reason: 'UNHANDLED_PURPOSE' };
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

    // Recharge Wallet + create the invoice in the same transaction (see the
    // comment on rechargeWallet itself) — INV-USG matches the prefix every
    // other wallet-recharge invoice uses (the hand-rolled `INV-` prefix this
    // replaced was invisible to every revenue-by-source query that filters
    // by prefix).
    let wallet: Awaited<ReturnType<typeof rechargeWallet>>;
    try {
      wallet = await rechargeWallet(
        organizationId,
        subtotal,
        paymentId,
        `Credits Purchased via Razorpay (${paymentId})`,
        {
          invoicePrefix: 'INV-USG',
          grandTotal: amountPaid,
          paymentId,
          gatewayName: 'RAZORPAY',
          description: 'Credits Purchased via Razorpay',
        }
      );
    } catch (err: any) {
      if (err?.code === 'P2002') {
        logger.info({ paymentId }, 'Razorpay webhook lost an idempotency race to the client-side confirmation. Skipping duplicate.');
        return { success: true, processed: false, reason: 'ALREADY_PROCESSED' };
      }
      throw err;
    }
    const invoice = wallet.invoice!;

    logger.info(
      { organizationId, paymentId, invoiceNumber: invoice.invoiceNumber, amountPaid, walletBalance: wallet.availableBalance.toString() },
      '✅ Razorpay Payment Processed: Wallet Credited & Invoice Generated!'
    );

    void sendPurchaseEmailToOwner(organizationId, invoice.description!, amountPaid, invoice.invoiceNumber);

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
