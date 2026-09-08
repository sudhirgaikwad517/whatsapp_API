import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as BillingService from '../services/billing-wallet.service.js';
import * as PaymentWebhookService from '../services/payment-webhook.service.js';
import { verifyAndFetchCapturedAmount } from '../services/razorpay.service.js';
import { computePlanQuote } from '../services/plan-pricing.service.js';
import { getTemplateSentCounts, getPricingRates } from '../services/usage-metrics.service.js';
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
    const rates = await getPricingRates(prisma);
    const calculatedCharges = Number((marketingSent * rates.marketingClientPrice + utilitySent * rates.utilityClientPrice).toFixed(2));
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

    // Invoice creation and the credit grant happen in one transaction, with
    // the invoice insert relying on paymentId's unique constraint — if two
    // concurrent requests for the same payment both got past the
    // findFirst check above (a genuine race: double-click, a client retry
    // after a slow response), only one transaction's invoice insert can
    // succeed; the other's unique-violation rolls its whole transaction
    // back, undoing that duplicate credit grant too, not just its invoice.
    let newBalance: number;
    let aiInvoice: Awaited<ReturnType<typeof createInvoiceRecord>>;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const balance = await addAiCredits(orgId, creditsToAdd, tx);
        const invoice = await createInvoiceRecord(
          {
            organizationId: orgId,
            invoicePrefix: 'INV-AI',
            grandTotal: amount,
            paymentId: razorpay_payment_id,
            gatewayName: 'RAZORPAY',
            description: `AI Credits Top-up (${creditsToAdd.toLocaleString()} credits)`,
          },
          tx
        );
        return { balance, invoice };
      });
      newBalance = result.balance;
      aiInvoice = result.invoice;
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new AppError('This payment has already been processed.', 409, 'ALREADY_PROCESSED');
      }
      throw err;
    }
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

    // Plan/credits update and invoice creation happen in one transaction —
    // see the matching comment in topupAiCredits above for why: only one
    // concurrent confirmation of the same paymentId can win the invoice
    // insert, and the loser's whole transaction (including the plan/credit
    // update) rolls back instead of double-applying.
    let planInvoice: Awaited<ReturnType<typeof createInvoiceRecord>>;
    try {
      planInvoice = await prisma.$transaction(async (tx) => {
        await tx.organization.update({
          where: { id: orgId },
          data: {
            planTier,
            aiCreditsBalance: { increment: creditsToAdd },
            planExpiryDate,
          },
        });

        return createInvoiceRecord(
          {
            organizationId: orgId,
            invoicePrefix: 'INV-PLAN',
            grandTotal: amount,
            paymentId: razorpay_payment_id,
            gatewayName: 'RAZORPAY',
            description: `${planTier} Plan Subscription — ${billingCycle === 'ANNUAL' ? 'Annual' : 'Monthly'} Billing`,
          },
          tx
        );
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new AppError('This payment has already been processed.', 409, 'ALREADY_PROCESSED');
      }
      throw err;
    }
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
    const { amount, purpose } = req.body;
    if (!amount || amount <= 0) {
      throw new AppError('Invalid amount', 400, 'INVALID_AMOUNT');
    }
    const orgId = req.user!.organizationId;

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
        // Razorpay copies order notes onto the resulting payment object —
        // this is what lets the webhook (payment-webhook.service.ts) know
        // which org and which purchase flow to credit if a payment is
        // captured by Razorpay but the client never completes its own
        // confirmation call (closed tab, crashed browser, lost network).
        // Without this, that payment would be captured with no wallet
        // credit, no invoice, and no way to recover it automatically.
        notes: { organizationId: orgId, purpose: purpose || 'wallet' },
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

    let wallet: Awaited<ReturnType<typeof BillingService.rechargeWallet>>;
    try {
      wallet = await BillingService.rechargeWallet(orgId, subtotal, referenceId, description, {
        invoicePrefix: 'INV-USG',
        grandTotal,
        paymentId: razorpay_payment_id,
        gatewayName: gateway || 'RAZORPAY',
        description: 'Credits Purchased via Razorpay',
      });
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new AppError('This payment has already been processed.', 409, 'ALREADY_PROCESSED');
      }
      throw err;
    }
    const usgInvoice = wallet.invoice!;
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
