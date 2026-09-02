import { Request, Response, NextFunction } from 'express';
import * as PaymentWebhookService from '../services/payment-webhook.service.js';

export async function handleRazorpayWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    const rawBody: Buffer = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    const result = await PaymentWebhookService.processRazorpayWebhook(rawBody.toString('utf8'), signature);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

