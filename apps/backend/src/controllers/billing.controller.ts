import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as BillingService from '../services/billing-wallet.service.js';
import * as PaymentWebhookService from '../services/payment-webhook.service.js';
import { prisma } from '../config/database.js';

export async function getWalletDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const wallet = await BillingService.getOrCreateWallet(orgId);

    const ledgers = await prisma.walletLedger.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.status(200).json({
      success: true,
      data: {
        wallet,
        ledgers,
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
