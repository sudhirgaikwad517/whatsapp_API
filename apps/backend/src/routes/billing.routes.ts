import { Router } from 'express';
import * as BillingController from '../controllers/billing.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { requirePageAccess } from '../middlewares/page-access.middleware.js';
import { UserRole } from '@prowexa/shared-types';

// Actually spending the org's money (buying a plan, topping up credits,
// recharging the wallet) is restricted to the org owner or a manager — a
// support agent with 'billing' page access can still view balances/invoices,
// but can't make a purchase, even by calling the API directly.
const purchaseOnly = authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER);

const router = Router();

// NOTE: Razorpay/Stripe payment-gateway webhooks live at /api/v1/webhooks/payments/*
// (see payment-webhooks.routes.ts) — deliberately outside this authenticated router,
// since the gateways' servers carry no tenant JWT to satisfy `authenticate` below.

router.use(authenticate);
router.use(tenantContext);

/**
 * @route   GET /api/v1/billing/credits
 * @desc    Get AI credits balance + plan expiry. Deliberately NOT gated by
 *          'billing' page access — Layout.tsx calls this on every page to
 *          show the "plan expired" banner to every member, regardless of
 *          which pages they're restricted to.
 * @access  Bearer
 */
router.get('/credits', BillingController.getAiCredits);

/**
 * @route   GET /api/v1/billing/settings
 * @desc    Get public invoice letterhead settings (company name/GSTIN/etc.) —
 *          needed by anyone downloading an invoice, not billing-specific.
 */
router.get('/settings', BillingController.getInvoiceSettings);

/**
 * @route   GET /api/v1/billing/wallet
 * @desc    Get wallet balance and ledger history
 * @access  Bearer (requires 'billing' page access)
 */
router.get('/wallet', requirePageAccess('billing'), BillingController.getWalletDetails);
router.post('/validate-plan-purchase', requirePageAccess('billing'), purchaseOnly, BillingController.validatePlanPurchase);
router.post('/purchase-plan', requirePageAccess('billing'), purchaseOnly, BillingController.purchasePlan);
router.get('/ledger', requirePageAccess('billing'), BillingController.getLedgers);
router.post('/topup-credits', requirePageAccess('billing'), purchaseOnly, BillingController.topupAiCredits);
router.post('/create-razorpay-order', requirePageAccess('billing'), purchaseOnly, BillingController.createRazorpayOrder);
router.post('/recharge-wallet', requirePageAccess('billing'), purchaseOnly, BillingController.rechargeWallet);

/**
 * @route   GET /api/v1/billing/invoices
 * @desc    Get organization tax invoices list
 * @access  Bearer (requires 'billing' page access)
 */
router.get('/invoices', requirePageAccess('billing'), BillingController.getInvoices);

export default router;
