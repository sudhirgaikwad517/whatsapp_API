import { Response, NextFunction } from 'express';
import * as OrgService from '../services/organization.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { checkAgentLimit, checkPlanNotExpired } from '../middlewares/plan-limits.middleware.js';

export async function getOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await OrgService.getOrganization(orgId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await OrgService.updateOrganization(orgId, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getMembers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await OrgService.getMembers(orgId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const targetUserId = req.params.userId;
    const requestingUserId = req.user!.userId;
    const data = await OrgService.removeMember(orgId, targetUserId, requestingUserId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const targetUserId = req.params.userId;
    const requestingUserId = req.user!.userId;
    const data = await OrgService.updateMember(orgId, targetUserId, requestingUserId, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function inviteMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    await checkPlanNotExpired(orgId);
    await checkAgentLimit(orgId);
    const data = await OrgService.inviteMember(orgId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
