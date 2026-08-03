import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { verifyMetaWebhookSignature } from '../webhooks/meta-signature.validator.js';
import { webhookQueue } from '../queues/index.js';
import { logger } from '../utils/logger.js';
import type { MetaWebhookPayload } from '@prowexa/shared-types';

/**
 * GET /api/v1/webhooks/whatsapp
 * Meta webhook verification handshake.
 * Meta sends: hub.mode=subscribe, hub.verify_token, hub.challenge
 */
export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode === 'subscribe' && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    logger.info('Meta webhook verification successful.');
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, token }, 'Meta webhook verification failed — token mismatch.');
    res.status(403).json({ error: 'Forbidden: Webhook verification failed.' });
  }
}

/**
 * POST /api/v1/webhooks/whatsapp
 * High-speed Meta incoming event receiver.
 * MUST respond 200 immediately and defer all processing to queue workers.
 */
export async function receiveWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // HMAC Signature Validation — reject forged payloads
    const rawBody: Buffer = (req as any).rawBody;
    const signature = req.headers['x-hub-signature-256'] as string;

    if (!verifyMetaWebhookSignature(rawBody, signature)) {
      logger.warn({ signature }, 'Meta webhook signature verification FAILED — possible spoofing attempt.');
      res.status(403).json({ error: 'Forbidden: Invalid webhook signature.' });
      return;
    }

    const payload = req.body as MetaWebhookPayload;
    logger.info({ object: payload?.object, entryCount: payload?.entry?.length }, 'Incoming Meta POST Webhook Event Received.');

    if (payload?.object !== 'whatsapp_business_account') {
      res.status(200).send('OK');
      return;
    }

    // Enqueue ALL webhook entries immediately for async processing
    if (Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        await webhookQueue.add('process-webhook-entry', entry, {
          priority: 1, // Highest priority queue slot
        });
      }
    }

    // CRITICAL: Respond 200 to Meta within 20 seconds or Meta will retry
    res.status(200).send('EVENT_RECEIVED');
  } catch (err) {
    next(err);
  }
}
