import { Request, Response, NextFunction } from 'express';
import * as AuthService from '../services/auth.service.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { setAccessTokenCookie, setRefreshTokenCookie, clearAuthCookies, isWebsiteSurface, COOKIE_NAMES } from '../utils/auth-cookies.js';
import { env } from '../config/env.js';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.registerUser(req.body);
    const website = isWebsiteSurface(req);
    setAccessTokenCookie(res, result.tokens.accessToken, undefined, website);
    setRefreshTokenCookie(res, result.tokens.refreshToken, undefined, website);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await AuthService.loginUser(req.body);
    const website = isWebsiteSurface(req);
    setAccessTokenCookie(res, result.accessToken, undefined, website);
    setRefreshTokenCookie(res, result.refreshToken, undefined, website);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const website = isWebsiteSurface(req);
    const refreshCookieName = website ? COOKIE_NAMES.WEBSITE_REFRESH_TOKEN : COOKIE_NAMES.REFRESH_TOKEN;
    // Accept the refresh token from the httpOnly cookie (matching this
    // request's surface) or the request body (a non-cookie API caller).
    const refreshToken = req.body?.refreshToken || (req as any).cookies?.[refreshCookieName];
    if (!refreshToken) {
      res.status(400).json({ success: false, error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token is required.' } });
      return;
    }
    const result = await AuthService.refreshAccessToken(refreshToken);
    setAccessTokenCookie(res, result.accessToken, undefined, website);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const website = isWebsiteSurface(req);
    const refreshCookieName = website ? COOKIE_NAMES.WEBSITE_REFRESH_TOKEN : COOKIE_NAMES.REFRESH_TOKEN;
    const refreshToken = req.body?.refreshToken || (req as any).cookies?.[refreshCookieName];
    if (refreshToken) {
      await AuthService.logoutUser(refreshToken);
    }
    clearAuthCookies(res, website);
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
  // FRONTEND_URL is the marketing site (wabtic.com), which uses tab/query-param
  // routing rather than real paths — see wabtic-website's App.tsx.
  const frontendBase = env.FRONTEND_URL.replace(/\/$/, '');
  if (!token) {
    return res.redirect(`${frontendBase}/?tab=login&verified=0`);
  }
  try {
    await AuthService.verifyEmail(token);
    res.redirect(`${frontendBase}/?tab=login&verified=1`);
  } catch {
    res.redirect(`${frontendBase}/?tab=login&verified=0`);
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
    // req.user only carries the JWT's own claims (userId, email, organizationId,
    // role) — no fullName, and the frontend's User shape expects `id` not
    // `userId`. Look up the DB row so this endpoint returns a complete,
    // correctly-shaped user object instead of a partial one.
    const dbUser = await AuthService.getUserById(req.user!.userId);
    const allowedPages = req.user!.isSuperAdmin
      ? []
      : (await AuthService.getMemberAllowedPages(req.user!.organizationId, req.user!.userId)) || [];
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user!.userId,
          email: req.user!.email,
          fullName: dbUser?.fullName || '',
          phoneNumber: dbUser?.phoneNumber || '',
          organizationId: req.user!.organizationId,
          role: req.user!.role,
          isSuperAdmin: req.user!.isSuperAdmin,
          allowedPages,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const data = await AuthService.updateProfile(userId, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;
    const data = await AuthService.changePassword(userId, currentPassword, newPassword);
    clearAuthCookies(res);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function changeEmail(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newEmail } = req.body;
    const data = await AuthService.changeEmail(userId, currentPassword, newEmail);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
