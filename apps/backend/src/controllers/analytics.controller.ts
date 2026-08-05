import { Response, NextFunction } from 'express';
import * as AnalyticsService from '../services/analytics.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export async function getOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await AnalyticsService.getDashboardOverview(orgId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSlaAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await AnalyticsService.getSlaAndAgentAnalytics(orgId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
