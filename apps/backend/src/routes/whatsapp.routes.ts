import { Router } from 'express';
import * as WhatsAppController from '../controllers/whatsapp.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { UserRole } from '@prowexa/shared-types';
import multer from 'multer';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const router = Router();

router.use(authenticate);
router.use(tenantContext);

/**
 * @route   POST /api/v1/whatsapp/embedded-signup
 * @desc    Meta Embedded Signup OAuth callback handler
 * @access  Bearer (Business Owner only)
 */
router.post('/embedded-signup', authorize(UserRole.BUSINESS_OWNER), WhatsAppController.embeddedSignup);

/**
 * @route   POST /api/v1/whatsapp/connect
 * @desc    Onboard Meta WABA Account credentials (encrypts Access Token)
 * @access  Bearer (Business Owner only)
 */
router.post('/connect', WhatsAppController.connectAccount);

/**
 * @route   POST /api/v1/whatsapp/media
 * @desc    Upload media to Meta CDN for campaigns
 * @access  Bearer
 */
router.post('/media', upload.single('file'), WhatsAppController.uploadMedia);

/**
 * @route   GET /api/v1/whatsapp/health
 * @desc    Check connected WABA phone number status and quality rating
 * @access  Bearer (All roles)
 */
router.get('/health', WhatsAppController.getAccountHealth);

/**
 * @route   GET /api/v1/whatsapp/templates
 * @desc    Get list of synced templates in organization
 * @access  Bearer
 */
router.get('/templates', WhatsAppController.getTemplates);

/**
 * @route   POST /api/v1/whatsapp/templates/sync
 * @desc    Fetch and sync message templates from Meta Graph API
 * @access  Bearer (Manager, Business Owner)
 */
router.post('/templates/sync', authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER), WhatsAppController.syncTemplates);

/**
 * @route   POST /api/v1/whatsapp/templates/create
 * @desc    Submit new message template to Meta Graph API
 * @access  Bearer (Manager, Business Owner)
 */
router.post('/templates/create', authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER), WhatsAppController.createTemplate);

export default router;
