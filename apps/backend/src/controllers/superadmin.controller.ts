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
