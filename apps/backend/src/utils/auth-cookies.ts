import type { Response } from 'express';
import { env } from '../config/env.js';

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';
const PRE_IMPERSONATION_COOKIE = 'preImpersonationToken';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function baseCookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd, // Secure requires HTTPS — true in prod, relaxed for local http dev
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    domain: env.COOKIE_DOMAIN || undefined, // e.g. ".wabtic.com" in prod, unset (host-only) in dev
    path: '/',
  };
}

export function setAccessTokenCookie(res: Response, token: string, maxAgeMs: number = FIFTEEN_MINUTES_MS): void {
  res.cookie(ACCESS_TOKEN_COOKIE, token, { ...baseCookieOptions(), maxAge: maxAgeMs });
}

export function setRefreshTokenCookie(res: Response, token: string, maxAgeMs: number = SEVEN_DAYS_MS): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, { ...baseCookieOptions(), maxAge: maxAgeMs });
}

export function setPreImpersonationCookie(res: Response, token: string, maxAgeMs: number = TWENTY_FOUR_HOURS_MS): void {
  res.cookie(PRE_IMPERSONATION_COOKIE, token, { ...baseCookieOptions(), maxAge: maxAgeMs });
}

export function clearAuthCookies(res: Response): void {
  const opts = baseCookieOptions();
  res.clearCookie(ACCESS_TOKEN_COOKIE, opts);
  res.clearCookie(REFRESH_TOKEN_COOKIE, opts);
  res.clearCookie(PRE_IMPERSONATION_COOKIE, opts);
}

export function clearPreImpersonationCookie(res: Response): void {
  res.clearCookie(PRE_IMPERSONATION_COOKIE, baseCookieOptions());
}

export const COOKIE_NAMES = {
  ACCESS_TOKEN: ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN: REFRESH_TOKEN_COOKIE,
  PRE_IMPERSONATION: PRE_IMPERSONATION_COOKIE,
};
