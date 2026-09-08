import { Router } from 'express';
import * as InboxController from '../controllers/inbox.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { requirePageAccess } from '../middlewares/page-access.middleware.js';
import { UserRole } from '@prowexa/shared-types';

const router = Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requirePageAccess('inbox'));

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
 * @access  Bearer (Business Owner, Manager only — a plain agent has no
 *          access to hand a chat to anyone, including themselves)
 */
router.patch(
  '/conversations/:id/assign',
  authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER),
  InboxController.assignAgent
);

/**
 * @route   PATCH /api/v1/inbox/conversations/:id/status
 * @desc    Update conversation status (OPEN, ESCALATED, RESOLVED)
 * @access  Bearer
 */
router.patch('/conversations/:id/status', InboxController.updateStatus);

/**
 * @route   DELETE /api/v1/inbox/conversations/:id/messages
 * @desc    Clear this chat's message history (WhatsApp-style "Clear Chat" — our side only)
 * @access  Bearer
 */
router.delete('/conversations/:id/messages', InboxController.clearMessages);

/**
 * @route   PATCH /api/v1/inbox/conversations/:id/disappearing-messages
 * @desc    Set/clear the disappearing-messages duration for this chat (0/24h/7d/90d)
 * @access  Bearer
 */
router.patch('/conversations/:id/disappearing-messages', InboxController.setDisappearingMessages);

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
