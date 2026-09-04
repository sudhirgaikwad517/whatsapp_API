import { Router } from 'express';
import * as OrgController from '../controllers/organization.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { requirePageAccess } from '../middlewares/page-access.middleware.js';
import { UserRole } from '@prowexa/shared-types';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

/**
 * @route   GET /api/v1/organization
 * @desc    Get current organization profile details
 * @access  Bearer (All roles)
 */
router.get('/', OrgController.getOrganization);

/**
 * @route   PUT /api/v1/organization
 * @desc    Update organization settings (name, timezone, logo)
 * @access  Bearer (Business Owner only)
 */
router.put('/', authorize(UserRole.BUSINESS_OWNER), OrgController.updateOrganization);
router.patch('/', authorize(UserRole.BUSINESS_OWNER), OrgController.updateOrganization);

/**
 * @route   GET /api/v1/organization/members
 * @desc    Get list of team members in organization
 * @access  Bearer (All roles)
 */
router.get('/members', requirePageAccess('team'), OrgController.getMembers);

/**
 * @route   DELETE /api/v1/organization/members/:userId
 * @desc    Remove team member from organization
 * @access  Bearer (Business Owner only)
 */
router.delete('/members/:userId', authorize(UserRole.BUSINESS_OWNER), OrgController.removeMember);

/**
 * @route   POST /api/v1/organization/members/invite
 * @desc    Invite support team member (MANAGER, AGENT)
 * @access  Bearer (Business Owner, Manager)
 */
router.post('/members/invite', authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER), requirePageAccess('team'), OrgController.inviteMember);

/**
 * @route   PATCH /api/v1/organization/members/:userId
 * @desc    Update a team member's active status, role, permitted pages, or profile details
 * @access  Bearer (Business Owner only)
 */
router.patch('/members/:userId', authorize(UserRole.BUSINESS_OWNER), OrgController.updateMember);

export default router;
