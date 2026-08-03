import { Router } from 'express';
import * as AnalyticsController from '../controllers/analytics.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Get top-level dashboard metrics (sent, delivered, read, failed, rates)
 * @access  Bearer
 */
router.get('/overview', AnalyticsController.getOverview);

export default router;
