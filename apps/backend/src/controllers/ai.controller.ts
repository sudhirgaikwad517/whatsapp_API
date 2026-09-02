import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as AIService from '../services/ai.service.js';
import { checkAiCopilotEnabled, checkPlanNotExpired } from '../middlewares/plan-limits.middleware.js';

export async function suggestReply(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    await checkPlanNotExpired(orgId);
    await checkAiCopilotEnabled(orgId);
    const { conversationId } = req.body;
    const suggestedText = await AIService.suggestReply(orgId, conversationId);
    res.status(200).json({ success: true, data: { suggestedText } });
  } catch (err) {
    next(err);
  }
}

export async function generateTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { prompt } = req.body;
    const templateText = await AIService.generateTemplateText(prompt || 'marketing promotion');
    res.status(200).json({ success: true, data: { templateText } });
  } catch (err) {
    next(err);
  }
}
