import { Router } from 'express';
import * as AnalyticsController from '../controllers/analytics.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { requirePageAccess } from '../middlewares/page-access.middleware.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Get top-level dashboard metrics (sent, delivered, read, failed, rates)
 * @access  Bearer — powers the Dashboard page, which every member can see
 *          (the 'dashboard' page key is unrestricted), so this deliberately
 *          isn't gated behind the separate 'analytics' page permission.
 */
router.get('/overview', AnalyticsController.getOverview);

/**
 * @route   GET /api/v1/analytics/sla
 * @desc    Get First Response Time (FRT), Resolution SLA & Agent Leaderboard metrics
 * @access  Bearer (requires 'analytics' page access)
 */
router.get('/sla', requirePageAccess('analytics'), AnalyticsController.getSlaAnalytics);

export default router;
