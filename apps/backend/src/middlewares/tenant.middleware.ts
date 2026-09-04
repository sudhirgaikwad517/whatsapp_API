import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { AppError } from './error-handler.middleware.js';
import { prisma } from '../config/database.js';

/**
 * Middleware: Inject tenant context (organizationId) into every request
 * from the authenticated JWT payload, ensuring all downstream queries are
 * automatically scoped to the correct tenant. Also enforces that the
 * member's org access hasn't been deactivated — checked on every request
 * (not just at login) so a suspension takes effect immediately, and
 * attaches the membership's allowedPages for requirePageAccess to use.
 */
export async function tenantContext(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user?.organizationId) {
    return next(new AppError('Tenant context could not be resolved.', 403, 'TENANT_CONTEXT_MISSING'));
  }

  // Super Admin impersonation issues a token scoped to a real organizationId
  // but isn't a real OrganizationMember row — nothing to check here.
  if (req.user.isSuperAdmin) {
    return next();
  }

  try {
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: req.user.organizationId, userId: req.user.userId } },
      select: { isActive: true, allowedPages: true },
    });

    if (!membership) {
      return next(new AppError('Tenant context could not be resolved.', 403, 'TENANT_CONTEXT_MISSING'));
    }
    if (!membership.isActive) {
      return next(new AppError('Your access to this organization has been deactivated.', 403, 'MEMBER_DEACTIVATED'));
    }

    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}
