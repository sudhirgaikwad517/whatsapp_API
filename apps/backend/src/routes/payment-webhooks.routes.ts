import { Router } from 'express';
import * as PaymentWebhooksController from '../controllers/payment-webhooks.controller.js';

const router = Router();

/**
 * @route   POST /api/v1/webhooks/payments/razorpay
 * @desc    Razorpay Payment Gateway server-to-server webhook.
 * @access  Public — HMAC-SHA256 signature validated inside the service.
 *          Deliberately NOT behind `authenticate`/`tenantContext`: Razorpay's
 *          servers carry no tenant JWT, so gating this on user auth made the
 *          endpoint unreachable by the real gateway.
 */
router.post('/razorpay', PaymentWebhooksController.handleRazorpayWebhook);

export default router;
