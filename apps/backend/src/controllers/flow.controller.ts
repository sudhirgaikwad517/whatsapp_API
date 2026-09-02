import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as FlowService from '../services/flow.service.js';
import { checkFlowLimit, checkPlanNotExpired } from '../middlewares/plan-limits.middleware.js';

export async function listFlows(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await FlowService.listFlows(orgId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getFlow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { id } = req.params;
    const data = await FlowService.getFlowById(orgId, id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createFlow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    await checkPlanNotExpired(orgId);
    await checkFlowLimit(orgId);
    const data = await FlowService.createFlow(orgId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateFlow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { id } = req.params;
    if (req.body?.isActive === true) {
      const existing = await FlowService.getFlowById(orgId, id);
      if (!existing.isActive) {
        await checkFlowLimit(orgId);
      }
    }
    const data = await FlowService.updateFlow(orgId, id, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteFlow(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { id } = req.params;
    const data = await FlowService.deleteFlow(orgId, id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
