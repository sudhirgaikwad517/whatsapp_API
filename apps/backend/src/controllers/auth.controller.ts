import { Request, Response, NextFunction } from 'express';
import * as AuthService from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { setAccessTokenCookie, setRefreshTokenCookie, clearAuthCookies, COOKIE_NAMES } from '../utils/auth-cookies.js';
import { env } from '../config/env.js';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.registerUser(req.body);
    setAccessTokenCookie(res, result.tokens.accessToken);
    setRefreshTokenCookie(res, result.tokens.refreshToken);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.loginUser(req.body);
    setAccessTokenCookie(res, result.accessToken);
    setRefreshTokenCookie(res, result.refreshToken);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    // Accept the refresh token from the httpOnly cookie (the main app) or the
    // request body (wabtic-website's own client, which manages its own tokens).
    const refreshToken = req.body?.refreshToken || (req as any).cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
    if (!refreshToken) {
      res.status(400).json({ success: false, error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token is required.' } });
      return;
    }
    const result = await AuthService.refreshAccessToken(refreshToken);
    setAccessTokenCookie(res, result.accessToken);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.body?.refreshToken || (req as any).cookies?.[COOKIE_NAMES.REFRESH_TOKEN];
    if (refreshToken) {
      await AuthService.logoutUser(refreshToken);
    }
    clearAuthCookies(res);
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * SSO session exchange: called by the main dashboard app when it receives
 * `sso_access`/`sso_refresh` handoff params from wabtic-website. Verifies the
 * tokens are genuinely signed by this server, then sets them as httpOnly
 * cookies instead of the frontend ever persisting them to localStorage.
 */
export async function createSessionFromTokens(req: Request, res: Response, next: NextFunction) {
  try {
    const { accessToken, refreshToken } = req.body;
    const result = await AuthService.verifySsoTokens(accessToken, refreshToken);
    setAccessTokenCookie(res, accessToken);
    if (refreshToken) setRefreshTokenCookie(res, refreshToken);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.verifyEmail(req.body.token);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Directly clickable from the verification email (a GET link, not an API
 * call) — verifies the token and redirects to a friendly frontend page
 * rather than returning raw JSON to whatever browser opened the link.
 */
export async function verifyEmailViaLink(req: Request, res: Response) {
  const token = req.query.token as string | undefined;
  const frontendBase = env.FRONTEND_URL.replace(/\/$/, '');
  if (!token) {
    return res.redirect(`${frontendBase}/login?verified=0`);
  }
  try {
    await AuthService.verifyEmail(token);
    res.redirect(`${frontendBase}/login?verified=1`);
  } catch {
    res.redirect(`${frontendBase}/login?verified=0`);
  }
}

export async function resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.resendVerificationEmail(req.body.email);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.forgotPassword(req.body.email);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.resetPassword(req.body.token, req.body.newPassword);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, data: { user: req.user } });
  } catch (err) {
    next(err);
  }
}
