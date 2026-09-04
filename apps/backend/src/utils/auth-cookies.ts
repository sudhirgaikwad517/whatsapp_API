import type { Request, Response } from 'express';
import { env } from '../config/env.js';

const ACCESS_TOKEN_COOKIE = 'accessToken';
const REFRESH_TOKEN_COOKIE = 'refreshToken';
const PRE_IMPERSONATION_COOKIE = 'preImpersonationToken';
// A completely separate cookie pair for wabtic-website's own session. Both
// pairs are still Domain=.wabtic.com (so api.wabtic.com sees whichever one a
// request carries), but the NAME differs — logging in on the marketing site
// only ever sets these, never the app-dashboard's accessToken/refreshToken,
// so a website login can no longer silently double as a dashboard login.
const WEBSITE_ACCESS_TOKEN_COOKIE = 'websiteAccessToken';
const WEBSITE_REFRESH_TOKEN_COOKIE = 'websiteRefreshToken';
// Set by wabtic-website's own axios client on every request so the backend
// knows which cookie pair to read/write for that request.
const WEBSITE_SURFACE_HEADER = 'x-client-surface';

export function isWebsiteSurface(req: Request): boolean {
  return req.headers[WEBSITE_SURFACE_HEADER] === 'website';
}

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

export function setAccessTokenCookie(res: Response, token: string, maxAgeMs: number = FIFTEEN_MINUTES_MS, website = false): void {
  res.cookie(website ? WEBSITE_ACCESS_TOKEN_COOKIE : ACCESS_TOKEN_COOKIE, token, { ...baseCookieOptions(), maxAge: maxAgeMs });
}

export function setRefreshTokenCookie(res: Response, token: string, maxAgeMs: number = SEVEN_DAYS_MS, website = false): void {
  res.cookie(website ? WEBSITE_REFRESH_TOKEN_COOKIE : REFRESH_TOKEN_COOKIE, token, { ...baseCookieOptions(), maxAge: maxAgeMs });
}

export function setPreImpersonationCookie(res: Response, token: string, maxAgeMs: number = TWENTY_FOUR_HOURS_MS): void {
  res.cookie(PRE_IMPERSONATION_COOKIE, token, { ...baseCookieOptions(), maxAge: maxAgeMs });
}

export function clearAuthCookies(res: Response, website = false): void {
  const opts = baseCookieOptions();
  if (website) {
    res.clearCookie(WEBSITE_ACCESS_TOKEN_COOKIE, opts);
    res.clearCookie(WEBSITE_REFRESH_TOKEN_COOKIE, opts);
    return;
  }
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
  WEBSITE_ACCESS_TOKEN: WEBSITE_ACCESS_TOKEN_COOKIE,
  WEBSITE_REFRESH_TOKEN: WEBSITE_REFRESH_TOKEN_COOKIE,
};
