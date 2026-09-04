import { Router } from 'express';
import * as AnalyticsController from '../controllers/analytics.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { requirePageAccess } from '../middlewares/page-access.middleware.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requirePageAccess('analytics'));

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Get top-level dashboard metrics (sent, delivered, read, failed, rates)
 * @access  Bearer
 */
router.get('/overview', AnalyticsController.getOverview);

/**
 * @route   GET /api/v1/analytics/sla
 * @desc    Get First Response Time (FRT), Resolution SLA & Agent Leaderboard metrics
 * @access  Bearer
 */
router.get('/sla', AnalyticsController.getSlaAnalytics);

export default router;
