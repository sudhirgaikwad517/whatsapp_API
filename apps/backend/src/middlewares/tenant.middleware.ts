import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { AppError } from './error-handler.middleware.js';

/**
 * Middleware: Inject tenant context (organizationId) into every request
 * from the authenticated JWT payload, ensuring all downstream queries
 * are automatically scoped to the correct tenant.
 */
export function tenantContext(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  if (!req.user?.organizationId) {
    return next(new AppError('Tenant context could not be resolved.', 403, 'TENANT_CONTEXT_MISSING'));
  }
  // organizationId is already on req.user, downstream services read from req.user.organizationId
  next();
}
