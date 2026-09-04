import { rateLimit } from 'express-rate-limit';

/**
 * Strict limiter for credential-entry endpoints only (login, register,
 * password reset) — these are the ones brute-force/credential-stuffing
 * actually targets. Previously this was applied to the ENTIRE /api/v1/auth
 * router, which also covers /me, /refresh and /session — routes a normal
 * active session calls routinely (every page load, every token refresh).
 * Sharing one 20-per-15-min budget across both meant ordinary usage alone
 * could exhaust it and lock a real user out of login for reasons that had
 * nothing to do with failed password attempts.
 */
export const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'AUTH_RATE_LIMIT_EXCEEDED', message: 'Too many auth attempts, please try again in 15 minutes.' } },
});
