import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { AppError } from './error-handler.middleware.js';

/**
 * Canonical page keys — kept in sync with apps/frontend/src/components/layout/Sidebar.tsx.
 * Used both to hide sidebar tabs and (here) to actually enforce access server-side,
 * so restricting a page is real security, not just UI hiding.
 */
export const PAGE_KEYS = [
  'dashboard',
  'inbox',
  'campaigns',
  'contacts',
  'templates',
  'auto-reply',
  'flows',
  'catalog',
  'billing',
  'team',
  'analytics',
  'settings',
  'profile',
] as const;

export type PageKey = (typeof PAGE_KEYS)[number];

/**
 * Must run after tenantContext (needs req.membership). The org owner
 * (BUSINESS_OWNER) always has full access regardless of allowedPages — the
 * point of this system is for the owner to restrict OTHER members, not
 * themselves. An empty allowedPages list means "unrestricted" (the default
 * for every existing member until an admin explicitly opts them into a
 * restricted set).
 */
export function requirePageAccess(page: PageKey) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (req.user?.isSuperAdmin || req.user?.role === 'BUSINESS_OWNER') {
      return next();
    }
    const allowedPages = req.membership?.allowedPages || [];
    if (allowedPages.length === 0 || allowedPages.includes(page)) {
      return next();
    }
    next(new AppError(`You don't have access to this section.`, 403, 'PAGE_ACCESS_DENIED'));
  };
}
