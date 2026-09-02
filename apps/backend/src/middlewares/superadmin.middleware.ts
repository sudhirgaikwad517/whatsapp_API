import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.middleware.js';
import { AppError } from './error-handler.middleware.js';

/**
 * Middleware: Restrict access to genuine Super Admin sessions only.
 * `authenticate` alone only proves the JWT is validly signed — it does not
 * prove the caller is a super admin. A regular tenant user's JWT (role:
 * BUSINESS_OWNER/AGENT/etc, no isSuperAdmin flag) must be rejected here.
 */
export function requireSuperAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (!req.user?.isSuperAdmin || req.user.role !== 'SUPER_ADMIN') {
    return next(new AppError('Super Admin access required.', 403, 'FORBIDDEN'));
  }
  next();
}
