import { Router } from 'express';
import * as AIController from '../controllers/ai.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

/**
 * @route   POST /api/v1/ai/suggest-reply
 * @desc    Generate AI Copilot response suggestion based on chat history & FAQ
 * @access  Bearer
 */
router.post('/suggest-reply', AIController.suggestReply);

/**
 * @route   POST /api/v1/ai/generate-template
 * @desc    Generate AI marketing broadcast template text
 * @access  Bearer
 */
router.post('/generate-template', AIController.generateTemplate);

export default router;
