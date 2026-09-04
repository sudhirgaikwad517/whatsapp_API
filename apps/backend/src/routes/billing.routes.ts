import { Router } from 'express';
import * as BillingController from '../controllers/billing.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { requirePageAccess } from '../middlewares/page-access.middleware.js';

const router = Router();

// NOTE: Razorpay/Stripe payment-gateway webhooks live at /api/v1/webhooks/payments/*
// (see payment-webhooks.routes.ts) — deliberately outside this authenticated router,
// since the gateways' servers carry no tenant JWT to satisfy `authenticate` below.

router.use(authenticate);
router.use(tenantContext);
router.use(requirePageAccess('billing'));

/**
 * @route   GET /api/v1/billing/wallet
 * @desc    Get wallet balance and ledger history
 * @access  Bearer
 */
router.get('/wallet', BillingController.getWalletDetails);
router.post('/validate-plan-purchase', BillingController.validatePlanPurchase);
router.post('/purchase-plan', BillingController.purchasePlan);
router.get('/credits', BillingController.getAiCredits);
router.get('/ledger', BillingController.getLedgers);
router.post('/topup-credits', BillingController.topupAiCredits);
router.post('/create-razorpay-order', BillingController.createRazorpayOrder);
router.post('/recharge-wallet', BillingController.rechargeWallet);

/**
 * @route   GET /api/v1/billing/settings
 * @desc    Get public invoice settings
 */
router.get('/settings', BillingController.getInvoiceSettings);

/**
 * @route   GET /api/v1/billing/invoices
 * @desc    Get organization tax invoices list
 * @access  Bearer
 */
router.get('/invoices', BillingController.getInvoices);

export default router;
