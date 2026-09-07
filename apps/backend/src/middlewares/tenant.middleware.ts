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
// A suspended org is still allowed to hit these — the frontend's suspended
// popup keeps the Profile/Support Portal tab reachable (so the org can raise
// a ticket) and needs GET /billing/credits to succeed to even know it's
// suspended in the first place; everything else is blocked.
function isAllowedWhileSuspended(req: AuthenticatedRequest): boolean {
  if (req.baseUrl === '/api/v1/organization') return true;
  if (req.baseUrl === '/api/v1/billing' && req.method === 'GET' && req.path === '/credits') return true;
  return false;
}

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
    const [membership, org] = await Promise.all([
      prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: req.user.organizationId, userId: req.user.userId } },
        select: { isActive: true, allowedPages: true },
      }),
      prisma.organization.findUnique({
        where: { id: req.user.organizationId },
        select: { isSuspended: true },
      }),
    ]);

    if (!membership) {
      return next(new AppError('Tenant context could not be resolved.', 403, 'TENANT_CONTEXT_MISSING'));
    }
    if (!membership.isActive) {
      return next(new AppError('Your access to this organization has been deactivated.', 403, 'MEMBER_DEACTIVATED'));
    }
    if (org?.isSuspended && !isAllowedWhileSuspended(req)) {
      return next(new AppError('Your organization has been suspended. Please contact support for assistance.', 403, 'ORG_SUSPENDED'));
    }

    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}
