import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as BillingService from '../services/billing-wallet.service.js';
import * as PaymentWebhookService from '../services/payment-webhook.service.js';
import { verifyAndFetchCapturedAmount } from '../services/razorpay.service.js';
import { computePlanQuote } from '../services/plan-pricing.service.js';
import { getTemplateSentCounts } from '../services/usage-metrics.service.js';
import { createInvoiceRecord } from '../services/invoice.service.js';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { sendMail, buildPurchaseConfirmationEmail } from '../utils/mailer.js';
import { logger } from '../utils/logger.js';

// Best-effort — a purchase must never fail because the confirmation email
// couldn't be sent, so this always swallows its own errors.
async function sendPurchaseEmail(userId: string, description: string, amount: number, invoiceNumber: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true } });
    if (!user) return;
    await sendMail({
      to: user.email,
      subject: 'Payment Confirmation — Prowexa',
      html: buildPurchaseConfirmationEmail({ fullName: user.fullName, description, amount, invoiceNumber }),
    });
  } catch (err) {
    logger.error({ userId, err }, 'Failed to send purchase confirmation email.');
  }
}

export async function getWalletDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    await BillingService.getOrCreateWallet(orgId);

    // Catch the ledger up on any usage debits that accrued since the last
    // reconciliation, before reading it — otherwise this page keeps showing
    // a stale ledger until the org's next recharge (see reconcileUnbilledUsage).
    const wallet = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Wallet" WHERE "organizationId" = ${orgId}::uuid FOR UPDATE`;
      return BillingService.reconcileUnbilledUsage(orgId, tx);
    });

    const [ledgers, invoices, campaignRecipients, inboundCount, ledgerDebitsSum] = await Promise.all([
      prisma.walletLedger.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.invoice.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.campaignRecipient.count({
        where: {
          campaign: { organizationId: orgId },
          status: { not: 'FAILED' },
        },
      }),
      prisma.message.count({
        where: {
          organizationId: orgId,
          direction: 'INBOUND',
        },
      }),
      prisma.walletLedger.aggregate({
        _sum: { amount: true },
        where: {
          organizationId: orgId,
          transactionType: { in: ['DEBIT', 'MANUAL_DEBIT'] },
        },
      }),
    ]);

    const { marketingSent, utilitySent } = await getTemplateSentCounts(prisma, { organizationId: orgId });
    const calculatedCharges = Number((marketingSent * 1.00 + utilitySent * 0.20).toFixed(2));
    const ledgerDebits = Number(ledgerDebitsSum._sum?.amount || 0);
    
    // Total Billed Charges should reflect actual usage costs
    const totalChargesBilled = Math.max(ledgerDebits, calculatedCharges);

    // Calculate net spendable balance (deducting usage charges if not yet committed to ledger)
    const dbBalance = Number(wallet.availableBalance || 0);
    const unbilledCharges = calculatedCharges > ledgerDebits ? calculatedCharges - ledgerDebits : 0;
    const netBalance = Number((dbBalance - unbilledCharges).toFixed(2));

    res.status(200).json({
      success: true,
      data: {
        wallet: {
          ...wallet,
          availableBalance: netBalance,
        },
        availableBalance: netBalance,
        ledgers,
        invoices,
        usage: {
          marketingSent,
          utilitySent,
          serviceCount: inboundCount,
          totalChargesBilled,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAiCredits(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { getAiCreditsBalance } = await import('../services/credits.service.js');
    const data = await getAiCreditsBalance(orgId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function topupAiCredits(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    const { addAiCredits } = await import('../services/credits.service.js');

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError('Incomplete payment details received from gateway.', 400, 'INVALID_PAYMENT_PAYLOAD');
    }

    // Idempotency: this payment may already have been credited
    const existingInvoice = await prisma.invoice.findFirst({ where: { paymentId: razorpay_payment_id } });
    if (existingInvoice) {
      throw new AppError('This payment has already been processed.', 409, 'ALREADY_PROCESSED');
    }

    const amount = await verifyAndFetchCapturedAmount(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    // Map ₹500 -> 1000 credits, ₹1500 -> 3500 credits, ₹3500 -> 10000 credits
    // (bucketed on the amount actually captured by Razorpay, never client input)
    let creditsToAdd = 1000;
    if (amount >= 3500) creditsToAdd = 10000;
    else if (amount >= 1500) creditsToAdd = 3500;

    const newBalance = await addAiCredits(orgId, creditsToAdd);

    const aiInvoice = await createInvoiceRecord({
      organizationId: orgId,
      invoicePrefix: 'INV-AI',
      grandTotal: amount,
      paymentId: razorpay_payment_id,
      gatewayName: 'RAZORPAY',
      description: `AI Credits Top-up (${creditsToAdd.toLocaleString()} credits)`,
    });
    void sendPurchaseEmail(req.user!.userId, aiInvoice.description!, amount, aiInvoice.invoiceNumber);

    res.status(200).json({
      success: true,
      data: {
        message: `${creditsToAdd.toLocaleString()} AI Credits added successfully!`,
        newBalance,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function purchasePlan(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { planTier, billingCycle, razorpay_payment_id, razorpay_order_id, razorpay_signature, isMock } = req.body;

    if (isMock) {
      throw new AppError('Mock payments are strictly disabled in production. Please configure Razorpay keys.', 403, 'PAYMENT_MOCK_DISABLED');
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError('Incomplete payment details received from gateway.', 400, 'INVALID_PAYMENT_PAYLOAD');
    }

    const existingInvoice = await prisma.invoice.findFirst({ where: { paymentId: razorpay_payment_id } });
    if (existingInvoice) {
      throw new AppError('This payment has already been processed.', 409, 'ALREADY_PROCESSED');
    }

    // Amount is read from Razorpay's own record of the payment — never from the client.
    const amount = await verifyAndFetchCapturedAmount(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new AppError('Organization not found', 404);

    // The amount actually paid must match what this plan+cycle should cost right
    // now (including proration) — otherwise a user could pay for STARTER and
    // claim ENTERPRISE. A small tolerance absorbs rupee-rounding only.
    const quote = computePlanQuote(planTier, billingCycle, org.planTier, org.planExpiryDate);
    const TOLERANCE_INR = 2;
    if (Math.abs(amount - quote.payableAmount) > TOLERANCE_INR) {
      throw new AppError(
        `Amount paid (₹${amount}) does not match the price of the ${planTier} plan (₹${quote.payableAmount}).`,
        400,
        'AMOUNT_MISMATCH'
      );
    }

    // Determine AI credits to add based on Plan Tier
    let creditsToAdd = 0;
    if (planTier === 'STARTER') creditsToAdd = 500;
    else if (planTier === 'PRO') creditsToAdd = 2500;
    else if (planTier === 'ENTERPRISE') creditsToAdd = 10000;

    // Determine validity
    const planExpiryDate = new Date();
    if (billingCycle === 'ANNUAL') {
      planExpiryDate.setDate(planExpiryDate.getDate() + 365);
    } else {
      planExpiryDate.setDate(planExpiryDate.getDate() + 30);
    }

    // Update the organization's planTier, increment AI credits, and set expiry date
    await prisma.organization.update({
      where: { id: orgId },
      data: { 
        planTier,
        aiCreditsBalance: { increment: creditsToAdd },
        planExpiryDate,
      },
    });

    const planInvoice = await createInvoiceRecord({
      organizationId: orgId,
      invoicePrefix: 'INV-PLAN',
      grandTotal: amount,
      paymentId: razorpay_payment_id,
      gatewayName: 'RAZORPAY',
      description: `${planTier} Plan Subscription — ${billingCycle === 'ANNUAL' ? 'Annual' : 'Monthly'} Billing`,
    });
    void sendPurchaseEmail(req.user!.userId, planInvoice.description!, amount, planInvoice.invoiceNumber);

    res.status(200).json({
      success: true,
      data: {
        message: `Successfully upgraded to ${planTier} plan!`,
        planTier,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function validatePlanPurchase(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { planTier, billingCycle } = req.body;

    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new AppError('Organization not found', 404);

    const quote = computePlanQuote(planTier, billingCycle, org.planTier, org.planExpiryDate);

    res.status(200).json({
      success: true,
      data: {
        ...quote,
        message: 'Eligible to purchase plan.',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createRazorpayOrder(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
      throw new AppError('Invalid amount', 400, 'INVALID_AMOUNT');
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(200).json({
        success: true,
        data: {
          id: `order_mock_${Date.now()}`,
          entity: 'order',
          amount: Math.round(amount * 100),
          currency: 'INR',
          key: 'rzp_test_mock',
          isMock: true,
        },
      });
    }

    const axios = (await import('axios')).default;
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const response = await axios.post(
      'https://api.razorpay.com/v1/orders',
      {
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
      },
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({
      success: true,
      data: {
        ...response.data,
        key: keyId,
        isMock: false,
      },
    });
  } catch (err: any) {
    if (err.isAxiosError && err.response) {
      console.error('Razorpay API Error:', err.response.data);
      return next(new AppError(`Razorpay Error: ${err.response.data.error?.description || 'Failed to create order'}`, 400, 'RAZORPAY_API_ERROR'));
    }
    next(err);
  }
}

export async function rechargeWallet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { gateway, razorpay_order_id, razorpay_payment_id, razorpay_signature, isMock } = req.body;

    if (isMock) {
      throw new AppError('Mock payments are strictly disabled in production. Please configure Razorpay keys.', 403, 'PAYMENT_MOCK_DISABLED');
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError('Incomplete payment details received from gateway.', 400, 'INVALID_PAYMENT_PAYLOAD');
    }

    const existingInvoice = await prisma.invoice.findFirst({ where: { paymentId: razorpay_payment_id } });
    if (existingInvoice) {
      throw new AppError('This payment has already been processed.', 409, 'ALREADY_PROCESSED');
    }

    // grandTotal is what was actually charged (gateway-confirmed); the wallet is
    // credited with the pre-tax subtotal, matching how the webhook path computes it.
    const grandTotal = await verifyAndFetchCapturedAmount(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    const subtotal = Number((grandTotal / 1.18).toFixed(2));

    const referenceId = razorpay_payment_id;
    const description = `Credits Purchased via ${gateway || 'Razorpay'}`;

    const wallet = await BillingService.rechargeWallet(orgId, subtotal, referenceId, description);

    const usgInvoice = await createInvoiceRecord({
      organizationId: orgId,
      invoicePrefix: 'INV-USG',
      grandTotal,
      paymentId: razorpay_payment_id,
      gatewayName: gateway || 'RAZORPAY',
      description: 'Credits Purchased via Razorpay',
    });
    void sendPurchaseEmail(req.user!.userId, usgInvoice.description!, grandTotal, usgInvoice.invoiceNumber);

    res.status(200).json({
      success: true,
      data: {
        message: 'Wallet recharged successfully',
        wallet,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getLedgers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const ledgers = await prisma.walletLedger.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.status(200).json({ success: true, data: ledgers });
  } catch (err) {
    next(err);
  }
}

export async function getInvoices(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const invoices = await PaymentWebhookService.getOrganizationInvoices(orgId);
    res.status(200).json({ success: true, data: invoices });
  } catch (err) {
    next(err);
  }
}

export async function getInvoiceSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const settings = await prisma.systemSettings.findFirst();
    res.status(200).json({ success: true, data: settings || {} });
  } catch (err) {
    next(err);
  }
}
