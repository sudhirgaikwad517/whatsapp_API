import { Router } from 'express';
import * as CampaignController from '../controllers/campaign.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { requirePageAccess } from '../middlewares/page-access.middleware.js';
import { UserRole } from '@prowexa/shared-types';

const router = Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requirePageAccess('campaigns'));

/**
 * @route   POST /api/v1/campaigns
 * @desc    Create & schedule bulk marketing campaign
 * @access  Bearer (Business Owner, Manager)
 */
router.post('/', authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER), CampaignController.createCampaign);

/**
 * @route   GET /api/v1/campaigns
 * @desc    Get list of all marketing campaigns
 * @access  Bearer (All roles)
 */
router.get('/', CampaignController.getCampaigns);

/**
 * @route   GET /api/v1/campaigns/:id/analytics
 * @desc    Get detailed campaign delivery analytics (Sent/Read/Failed)
 * @access  Bearer (All roles)
 */
router.get('/:id/analytics', CampaignController.getCampaignAnalytics);

/**
 * @route   GET /api/v1/campaigns/:id/recipients
 * @desc    Get tabbed campaign recipient status records with timestamps & Meta errors
 * @access  Bearer (All roles)
 */
router.get('/:id/recipients', CampaignController.getCampaignRecipients);

/**
 * @route   POST /api/v1/campaigns/:id/retry
 * @desc    Retry/Resume unsent or failed campaign dispatches
 * @access  Bearer (Business Owner, Manager)
 */
router.post('/:id/retry', authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER), CampaignController.retryCampaign);

/**
 * @route   GET /api/v1/campaigns/:id/repeat-audience
 * @desc    Same-audience contactIds for a previous campaign, re-checked against current opt-in/deletion state
 * @access  Bearer (Business Owner, Manager)
 */
router.get('/:id/repeat-audience', authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER), CampaignController.getCampaignRepeatAudience);

/**
 * @route   POST /api/v1/campaigns/:id/relaunch
 * @desc    Launch a new campaign to the same recipients as a previous one, same template/settings
 * @access  Bearer (Business Owner, Manager)
 */
router.post('/:id/relaunch', authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER), CampaignController.relaunchCampaign);

/**
 * @route   DELETE /api/v1/campaigns/:id
 * @desc    Delete a campaign and its recipient history
 * @access  Bearer (Business Owner, Manager)
 */
router.delete('/:id', authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER), CampaignController.removeCampaign);

export default router;
