import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as BillingService from '../services/billing-wallet.service.js';
import * as PaymentWebhookService from '../services/payment-webhook.service.js';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';

export async function getWalletDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const wallet = await BillingService.getOrCreateWallet(orgId);

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

    const exactTemplateCounts: any[] = await prisma.$queryRaw`
      SELECT 
        COUNT(*) FILTER (WHERE t."category" ILIKE 'marketing') as marketing_sent,
        COUNT(*) FILTER (WHERE t."category" ILIKE 'utility') as utility_sent
      FROM "Message" m
      INNER JOIN "Template" t ON m."content"->>'templateName' = t."name" AND t."organizationId" = m."organizationId"
      WHERE m."organizationId" = ${orgId}::uuid
        AND m."direction" = 'OUTBOUND'
        AND m."type" = 'TEMPLATE'
        AND m."status" != 'FAILED'
    `;

    const marketingSent = Number(exactTemplateCounts[0]?.marketing_sent || 0);
    const utilitySent = Number(exactTemplateCounts[0]?.utility_sent || 0);
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
    const { amount } = req.body;
    const { addAiCredits } = await import('../services/credits.service.js');
    
    // Map ₹500 -> 1000 credits, ₹1500 -> 3500 credits, ₹3500 -> 10000 credits
    let creditsToAdd = 1000;
    if (Number(amount) >= 3500) creditsToAdd = 10000;
    else if (Number(amount) >= 1500) creditsToAdd = 3500;

    const newBalance = await addAiCredits(orgId, creditsToAdd);

    res.status(200).json({
      success: true,
      data: {
        message: `${creditsToAdd} AI Credits added successfully`,
        newBalance,
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
      throw new AppError('Razorpay credentials are not configured on the server. Please add RAZORPAY_KEY_ID to .env', 500, 'SERVER_MISCONFIGURATION');
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
    const { amount, gateway, razorpay_order_id, razorpay_payment_id, razorpay_signature, isMock } = req.body;

    if (isMock) {
      throw new AppError('Mock payments are strictly disabled in production. Please configure Razorpay keys.', 403, 'PAYMENT_MOCK_DISABLED');
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new AppError('Incomplete payment details received from gateway.', 400, 'INVALID_PAYMENT_PAYLOAD');
    }

    const crypto = await import('crypto');
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keySecret) {
      throw new AppError('Razorpay secret key not configured on server.', 500, 'SERVER_MISCONFIGURATION');
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');
      
    if (expectedSignature !== razorpay_signature) {
      throw new AppError('Invalid payment signature. Payment rejected.', 400, 'INVALID_SIGNATURE');
    }

    const referenceId = razorpay_payment_id || `PAY_${Date.now()}`;
    const description = `Wallet Recharge via ${gateway || 'RAZORPAY'}`;

    const wallet = await BillingService.rechargeWallet(orgId, Number(amount), referenceId, description);

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

export async function handleRazorpayWebhook(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const result = await PaymentWebhookService.processRazorpayWebhook(rawBody, signature);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function handleStripeWebhook(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const signature = (req.headers['stripe-signature'] as string) || '';
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    const result = await PaymentWebhookService.processStripeWebhook(rawBody, signature);
    res.status(200).json(result);
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
