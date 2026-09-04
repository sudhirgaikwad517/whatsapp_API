import { Router } from 'express';
import * as ContactController from '../controllers/contact.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { requirePageAccess } from '../middlewares/page-access.middleware.js';
import { UserRole } from '@prowexa/shared-types';

const router = Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requirePageAccess('contacts'));

/**
 * @route   GET /api/v1/contacts
 * @desc    Paginated contact list with search & tag filtering
 * @access  Bearer (All roles)
 */
router.get('/', ContactController.getContacts);

/**
 * @route   POST /api/v1/contacts
 * @desc    Create new contact
 * @access  Bearer (Manager, Agent, Business Owner)
 */
router.post('/', ContactController.createContact);

/**
 * @route   POST /api/v1/contacts/import
 * @desc    Bulk import contacts array (CSV)
 * @access  Bearer (Manager, Business Owner)
 */
router.post('/import', authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER), ContactController.importContacts);

/**
 * @route   GET /api/v1/contacts/tags
 * @desc    List organization tags
 * @access  Bearer
 */
router.get('/tags', ContactController.getTags);

/**
 * @route   POST /api/v1/contacts/tags
 * @desc    Create new contact tag
 * @access  Bearer (Manager, Business Owner)
 */
router.post('/tags', authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER), ContactController.createTag);

/**
 * @route   PATCH /api/v1/contacts/:id/opt-status
 * @desc    Toggle contact opt-in / opt-out status
 * @access  Bearer (Manager, Business Owner)
 */
router.patch('/:id/opt-status', authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER), ContactController.toggleOptStatus);

/**
 * @route   GET /api/v1/contacts/:id/timeline
 * @desc    Get complete contact communication history timeline
 * @access  Bearer (All roles)
 */
router.get('/:id/timeline', ContactController.getContactTimeline);

/**
 * @route   DELETE /api/v1/contacts/:id
 * @desc    Soft delete contact
 * @access  Bearer (Manager, Business Owner)
 */
router.delete('/:id', authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER), ContactController.deleteContact);

export default router;
