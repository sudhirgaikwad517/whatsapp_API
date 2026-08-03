import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as AutoResponderService from '../services/auto-responder.service.js';

export async function getRules(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const rules = await AutoResponderService.getOrganizationRules(orgId);
    res.status(200).json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
}

export async function createRule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const rule = await AutoResponderService.createRule(orgId, req.body);
    res.status(201).json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
}

export async function updateRule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const ruleId = req.params.id;
    const rule = await AutoResponderService.updateRule(orgId, ruleId, req.body);
    res.status(200).json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
}

export async function deleteRule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const ruleId = req.params.id;
    await AutoResponderService.deleteRule(orgId, ruleId);
    res.status(200).json({ success: true, message: 'Rule deleted successfully.' });
  } catch (err) {
    next(err);
  }
}
