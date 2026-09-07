import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.middleware.js';
import { AppError } from './error-handler.middleware.js';

/**
 * Middleware: Restrict access to genuine Super Admin sessions only.
 * `authenticate` alone only proves the JWT is validly signed — it does not
 * prove the caller is a super admin. A regular tenant user's JWT (role:
 * BUSINESS_OWNER/AGENT/etc) never carries `isSuperAdmin`, so checking that
 * flag alone is sufficient — it's only ever set by loginSuperAdmin, for any
 * active SuperAdminUser row regardless of their specific admin role
 * (SUPER_ADMIN/FINANCE_ADMIN/OPERATIONS_ADMIN/SUPPORT_ADMIN/SALES_ADMIN/
 * DEVELOPER). Previously this also required role === 'SUPER_ADMIN' exactly,
 * which locked every other scoped admin role out of the entire panel with a
 * 403 despite a valid login — there's no per-role permission system to
 * differentiate them yet, so all admin roles get full access for now.
 */
export function requireSuperAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (!req.user?.isSuperAdmin) {
    return next(new AppError('Super Admin access required.', 403, 'FORBIDDEN'));
  }
  next();
}
