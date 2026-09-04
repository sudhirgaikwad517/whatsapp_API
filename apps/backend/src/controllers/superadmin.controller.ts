import { Request, Response, NextFunction } from 'express';
import * as SuperAdminService from '../services/superadmin.service.js';
import { extractToken, type AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import {
  setAccessTokenCookie,
  setPreImpersonationCookie,
  clearPreImpersonationCookie,
  clearAuthCookies,
  COOKIE_NAMES,
} from '../utils/auth-cookies.js';
import { AppError } from '../middlewares/error-handler.middleware.js';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const data = await SuperAdminService.loginSuperAdmin(email, password);
    setAccessTokenCookie(res, data.accessToken, 24 * 60 * 60 * 1000);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardKpi(req: Request, res: Response, next: NextFunction) {
  try {
    const timeRange = (req.query.timeRange as string) || 'all';
    const data = await SuperAdminService.getExecutiveDashboardKpi(timeRange);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getOrganizations(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 30;
    const search = (req.query.search as string) || '';

    const data = await SuperAdminService.getOrganizationsList({ page, limit, search });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function impersonateOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { organizationId, reason } = req.body;
    const data = await SuperAdminService.impersonateTenant(organizationId, req.user!.userId, reason);

    // Swap the active session cookie to the impersonation token, but keep the
    // super admin's own token recoverable via a separate cookie so "stop
    // impersonation" can restore it without ever handling raw tokens in JS.
    const currentSuperAdminToken = extractToken(req);
    if (currentSuperAdminToken) {
      setPreImpersonationCookie(res, currentSuperAdminToken);
    }
    setAccessTokenCookie(res, data.impersonationToken, 15 * 60 * 1000);

    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * @route   POST /api/v1/superadmin/stop-impersonation
 * @desc    Restore the original Super Admin session after impersonating a tenant.
 * Deliberately not behind `requireSuperAdmin` — during impersonation the active
 * session cookie belongs to the tenant user, not the super admin; this route
 * authenticates purely off the separate backup cookie instead.
 */
export async function stopImpersonation(req: Request, res: Response, next: NextFunction) {
  try {
    const backupToken = (req as any).cookies?.[COOKIE_NAMES.PRE_IMPERSONATION];
    if (!backupToken) {
      throw new AppError('No super admin session to restore.', 400, 'NO_BACKUP_SESSION');
    }

    const jwt = (await import('jsonwebtoken')).default;
    const { env } = await import('../config/env.js');
    let decoded: any;
    try {
      decoded = jwt.verify(backupToken, env.JWT_SECRET, { algorithms: ['HS256'] });
    } catch {
      clearPreImpersonationCookie(res);
      throw new AppError('Super admin session has expired. Please log in again.', 401, 'INVALID_TOKEN');
    }

    setAccessTokenCookie(res, backupToken, 24 * 60 * 60 * 1000);
    clearPreImpersonationCookie(res);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          organizationId: 'SYSTEM_SUPER_ADMIN',
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleSuspension(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, isSuspended } = req.body;
    const data = await SuperAdminService.toggleOrganizationSuspension(organizationId, isSuspended);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updatePlanTier(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, planTier } = req.body;
    const data = await SuperAdminService.updateOrganizationPlanTier(organizationId, planTier);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function grantAiCredits(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, creditsAmount } = req.body;
    const data = await SuperAdminService.grantAiCreditsToOrganization(organizationId, Number(creditsAmount));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function manualCreditWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, amount, description } = req.body;
    const data = await SuperAdminService.creditWalletForOrganization(organizationId, Number(amount), description);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updatePricingRule(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await SuperAdminService.updatePricingRule(req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function replyTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { ticketId } = req.params;
    const { message, status } = req.body;
    const data = await SuperAdminService.superAdminReplyTicket(ticketId, message, status);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getOrgFinancials(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const data = await SuperAdminService.getOrganizationFinancialDetails(id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function saveMasterAiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const { apiKey } = req.body;
    const data = await SuperAdminService.saveMasterAiKey(apiKey || '');
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getMasterAiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await SuperAdminService.getMasterAiKey();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateOrgAiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, apiKey } = req.body;
    const data = await SuperAdminService.updateOrganizationAiKey(organizationId, apiKey);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSystemSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await SuperAdminService.getSystemSettings();
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateSystemSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await SuperAdminService.updateSystemSettings(req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function uploadInvoiceLogo(req: Request, res: Response, next: NextFunction) {
  try {
    if (!(req as any).file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE_PROVIDED', message: 'Please select an image file to upload.' } });
      return;
    }
    const host = req.get('host') || 'localhost:5050';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const { compressAndSaveImage } = await import('../services/media-compression.service.js');
    const result = await compressAndSaveImage((req as any).file.buffer, baseUrl);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
