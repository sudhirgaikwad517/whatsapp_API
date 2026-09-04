import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './error-handler.middleware.js';
import { UserRole } from '@prowexa/shared-types';
import { COOKIE_NAMES } from '../utils/auth-cookies.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    organizationId: string;
    role: UserRole;
    isSuperAdmin?: boolean;
  };
  // Populated by tenantContext — the caller's OrganizationMember row, so
  // downstream middleware/controllers don't each re-query it.
  membership?: {
    isActive: boolean;
    allowedPages: string[];
  };
}

/**
 * Middleware: Verify JWT Bearer token and attach user payload to request.
 */
/**
 * Extracts the current request's bearer token from the Authorization header
 * or, failing that, the httpOnly access-token cookie. Exported so handlers
 * that need the raw current token (e.g. to back it up before impersonation)
 * don't have to duplicate this precedence logic.
 */
export function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : (req as any).cookies?.[COOKIE_NAMES.ACCESS_TOKEN];
}

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = extractToken(req);

  if (!token) {
    return next(new AppError('Authorization token is required.', 401, 'UNAUTHORIZED'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as AuthenticatedRequest['user'];
    req.user = decoded;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Access token has expired.', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid access token.', 401, 'INVALID_TOKEN'));
  }
}

/**
 * Middleware: RBAC - Restrict access by allowed roles.
 * Usage: authorize('BUSINESS_OWNER', 'MANAGER')
 */
export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('User not authenticated.', 401, 'UNAUTHORIZED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Required role: [${roles.join(', ')}].`,
          403,
          'FORBIDDEN'
        )
      );
    }
    next();
  };
}
