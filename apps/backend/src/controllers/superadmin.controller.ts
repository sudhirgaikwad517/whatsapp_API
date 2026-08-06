import { Request, Response, NextFunction } from 'express';
import * as SuperAdminService from '../services/superadmin.service.js';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const data = await SuperAdminService.loginSuperAdmin(email, password);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getDashboardKpi(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await SuperAdminService.getExecutiveDashboardKpi();
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

export async function impersonateOrganization(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, reason } = req.body;
    const data = await SuperAdminService.impersonateTenant(organizationId, undefined, reason);
    res.status(200).json({ success: true, data });
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
