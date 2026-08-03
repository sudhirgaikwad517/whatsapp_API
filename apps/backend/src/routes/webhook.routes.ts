import { Router } from 'express';
import * as WebhookController from '../controllers/webhook.controller.js';

const router = Router();

/**
 * @route   GET /api/v1/webhooks/whatsapp
 * @desc    Meta webhook verification (hub.challenge handshake)
 * @access  Public — No JWT required (called by Meta servers)
 */
router.get('/whatsapp', WebhookController.verifyWebhook);

/**
 * @route   POST /api/v1/webhooks/whatsapp
 * @desc    Receive incoming WhatsApp events from Meta (messages, delivery status)
 * @access  Public — HMAC-SHA256 signature validated inside controller
 */
router.post('/whatsapp', WebhookController.receiveWebhook);

export default router;
