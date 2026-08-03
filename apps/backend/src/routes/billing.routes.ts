import { Router } from 'express';
import * as BillingController from '../controllers/billing.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

/**
 * @route   GET /api/v1/billing/wallet
 * @desc    Get wallet balance and ledger history
 * @access  Bearer
 */
router.get('/wallet', BillingController.getWalletDetails);

/**
 * @route   GET /api/v1/billing/invoices
 * @desc    Get organization tax invoices list
 * @access  Bearer
 */
router.get('/invoices', BillingController.getInvoices);

/**
 * @route   POST /api/v1/billing/webhooks/razorpay
 * @desc    Razorpay Payment Gateway Webhook Verification
 */
router.post('/webhooks/razorpay', BillingController.handleRazorpayWebhook);

/**
 * @route   POST /api/v1/billing/webhooks/stripe
 * @desc    Stripe Payment Gateway Webhook Verification
 */
router.post('/webhooks/stripe', BillingController.handleStripeWebhook);

export default router;
