import { Router } from 'express';
import * as InboxController from '../controllers/inbox.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

/**
 * @route   GET /api/v1/inbox/conversations
 * @desc    Fetch active conversations with filter & pagination
 * @access  Bearer
 */
router.get('/conversations', InboxController.getConversations);

/**
 * @route   GET /api/v1/inbox/conversations/:id/messages
 * @desc    Get paginated message thread for a conversation
 * @access  Bearer
 */
router.get('/conversations/:id/messages', InboxController.getMessages);

/**
 * @route   POST /api/v1/inbox/conversations/:id/messages
 * @desc    Send outbound text message to contact via Meta Graph API
 * @access  Bearer
 */
router.post('/conversations/:id/messages', InboxController.sendMessage);

/**
 * @route   PATCH /api/v1/inbox/conversations/:id/assign
 * @desc    Assign conversation to team agent
 * @access  Bearer
 */
router.patch('/conversations/:id/assign', InboxController.assignAgent);

/**
 * @route   GET /api/v1/inbox/conversations/:id/notes
 * @desc    Get list of internal collaboration notes for conversation
 * @access  Bearer
 */
router.get('/conversations/:id/notes', InboxController.getNotes);

/**
 * @route   POST /api/v1/inbox/conversations/:id/notes
 * @desc    Add internal collaboration note
 * @access  Bearer
 */
router.post('/conversations/:id/notes', InboxController.addNote);

/**
 * @route   POST /api/v1/inbox/conversations/:id/template
 * @desc    Send outbound template message to contact
 * @access  Bearer
 */
router.post('/conversations/:id/template', InboxController.sendTemplate);

/**
 * @route   POST /api/v1/inbox/conversations/:id/media
 * @desc    Send outbound media attachment (image, pdf, doc, audio)
 * @access  Bearer
 */
router.post('/conversations/:id/media', InboxController.sendMedia);

export default router;
