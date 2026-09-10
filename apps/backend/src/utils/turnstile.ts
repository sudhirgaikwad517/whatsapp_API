import axios from 'axios';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { logger } from './logger.js';

/**
 * Verifies a Cloudflare Turnstile ("Verify you are human") token against
 * Cloudflare's own siteverify endpoint. Used on login and register — both
 * the dashboard's own pages AND wabtic-website's LoginPage/RegisterPage,
 * since they call this same backend.
 *
 * If TURNSTILE_SECRET_KEY isn't configured, this is a no-op (skips
 * enforcement) rather than locking everyone out — matches how this app
 * degrades other optional integrations (Razorpay, Gemini) when unconfigured.
 */
export async function verifyTurnstileToken(token: string | undefined, remoteIp?: string): Promise<void> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) return;

  if (!token) {
    throw new AppError('Please complete the "Verify you are human" check.', 400, 'CAPTCHA_REQUIRED');
  }

  try {
    const params = new URLSearchParams({ secret, response: token });
    if (remoteIp) params.set('remoteip', remoteIp);

    const res = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', params);
    if (!res.data?.success) {
      throw new AppError('Human verification failed — please try again.', 400, 'CAPTCHA_FAILED');
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    logger.error({ err }, 'Turnstile siteverify request failed.');
    throw new AppError('Human verification failed — please try again.', 400, 'CAPTCHA_FAILED');
  }
}
