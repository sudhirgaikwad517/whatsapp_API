import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as BillingService from '../services/billing-wallet.service.js';
import * as PaymentWebhookService from '../services/payment-webhook.service.js';
import { prisma } from '../config/database.js';

export async function getWalletDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const wallet = await BillingService.getOrCreateWallet(orgId);

    const [ledgers, invoices, marketingSent, rawOutboundTemplates, serviceCount, ledgerDebitsSum] = await Promise.all([
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
          direction: 'OUTBOUND',
          type: 'TEMPLATE',
          status: 'DELIVERED',
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
    
    const utilitySent = rawOutboundTemplates > marketingSent ? rawOutboundTemplates - marketingSent : 0;
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
          serviceCount,
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

export async function rechargeWallet(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { amount, gateway } = req.body;

    const referenceId = `PAY_${Date.now()}`;
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
