import { Router } from 'express';
import * as SuperAdminController from '../controllers/superadmin.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireSuperAdmin } from '../middlewares/superadmin.middleware.js';

const router = Router();

/**
 * @route   POST /api/v1/superadmin/login
 * @desc    Super Admin ERP Portal Authentication
 */
router.post('/login', SuperAdminController.login);

/**
 * @route   POST /api/v1/superadmin/stop-impersonation
 * @desc    Restore the original Super Admin session after impersonating a tenant.
 * Deliberately before `requireSuperAdmin`: while impersonating, the active
 * session belongs to the tenant user — this route authenticates off a
 * separate backup cookie instead (see controller).
 */
router.post('/stop-impersonation', authenticate, SuperAdminController.stopImpersonation);

router.use(authenticate);
router.use(requireSuperAdmin);

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
router.get('/organizations/:id/financials', SuperAdminController.getOrgFinancials);
router.post('/impersonate', SuperAdminController.impersonateOrganization);

/**
 * @route   POST /api/v1/superadmin/suspension
 * @desc    Toggle organization suspension state
 */
router.post('/suspension', SuperAdminController.toggleSuspension);
router.post('/plan-tier', SuperAdminController.updatePlanTier);
router.post('/grant-credits', SuperAdminController.grantAiCredits);
router.post('/credit-wallet', SuperAdminController.manualCreditWallet);
router.post('/pricing-rule', SuperAdminController.updatePricingRule);
router.post('/tickets/:ticketId/reply', SuperAdminController.replyTicket);
router.get('/global-ai-key', SuperAdminController.getMasterAiKey);
router.post('/global-ai-key', SuperAdminController.saveMasterAiKey);
router.post('/org-ai-key', SuperAdminController.updateOrgAiKey);

router.get('/settings', SuperAdminController.getSystemSettings);
router.put('/settings', SuperAdminController.updateSystemSettings);

export default router;
