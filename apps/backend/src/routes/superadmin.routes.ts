import { Router } from 'express';
import * as SuperAdminController from '../controllers/superadmin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * @route   POST /api/v1/superadmin/login
 * @desc    Super Admin ERP Portal Authentication
 */
router.post('/login', SuperAdminController.login);

router.use(authenticate);

/**
 * @route   GET /api/v1/superadmin/dashboard/kpi
 * @desc    Get real-time Executive Dashboard KPIs across all organizations
 */
router.get('/dashboard/kpi', SuperAdminController.getDashboardKpi);

/**
 * @route   GET /api/v1/superadmin/organizations
 * @desc    Get list of all organizations with WABA and Wallet telemetry
 */
router.get('/organizations', SuperAdminController.getOrganizations);

/**
 * @route   POST /api/v1/superadmin/impersonate
 * @desc    Impersonate organization (Audit-Logged short-lived JWT)
 */
router.post('/impersonate', SuperAdminController.impersonateOrganization);

/**
 * @route   POST /api/v1/superadmin/suspension
 * @desc    Toggle organization suspension state
 */
router.post('/suspension', SuperAdminController.toggleSuspension);

export default router;
