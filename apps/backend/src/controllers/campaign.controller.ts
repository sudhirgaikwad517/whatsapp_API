import { Response, NextFunction } from 'express';
import * as CampaignService from '../services/campaign.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export async function createCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await CampaignService.createCampaign(orgId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCampaigns(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await CampaignService.listCampaigns(orgId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCampaignAnalytics(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const campaignId = req.params.id;
    const data = await CampaignService.getCampaignAnalytics(orgId, campaignId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function retryCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const campaignId = req.params.id;
    const data = await CampaignService.retryCampaign(orgId, campaignId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function removeCampaign(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const campaignId = req.params.id;
    const data = await CampaignService.deleteCampaign(orgId, campaignId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
