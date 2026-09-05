import { Router } from 'express';
import * as LeadController from '../controllers/lead.controller.js';

const router = Router();

/**
 * @route   POST /api/v1/leads
 * @desc    Capture a website visitor lead (marketing site "Contact" popup) —
 *          deliberately public, no auth, since the visitor has no account
 *          yet. Rate-limited by the global per-IP apiLimiter in app.ts.
 * @access  Public
 */
router.post('/', LeadController.createLead);

export default router;
