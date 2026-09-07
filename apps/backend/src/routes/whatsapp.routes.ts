import { Router } from 'express';
import * as WhatsAppController from '../controllers/whatsapp.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { UserRole } from '@prowexa/shared-types';
import multer from 'multer';
import { AppError } from '../middlewares/error-handler.middleware.js';

// Matches Meta's actual supported media types for WhatsApp messages/campaigns
// (image, video, audio, document) — this buffer is forwarded straight to
// Meta's Media API, so this is the last chance to reject an unexpected type
// before it leaves our server.
const ALLOWED_WHATSAPP_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp',
  'video/mp4', 'video/3gpp',
  'audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg',
  'application/pdf', 'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_WHATSAPP_MIME_TYPES.has(file.mimetype)) {
      return cb(new AppError(`Unsupported file type: ${file.mimetype}.`, 400, 'UNSUPPORTED_FILE_TYPE'));
    }
    cb(null, true);
  },
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
router.post('/connect', authorize(UserRole.BUSINESS_OWNER), WhatsAppController.connectAccount);

/**
 * @route   POST /api/v1/whatsapp/media
 * @desc    Upload media to Meta CDN for campaigns
 * @access  Bearer
 */
router.post('/media', upload.single('file'), WhatsAppController.uploadMedia);

/**
 * @route   POST /api/v1/whatsapp/templates/upload-header-sample
 * @desc    Upload a sample header image for Meta's template review (a
 *          different upload mechanism than /media — produces a "handle" via
 *          Meta's Resumable Upload API, not a messaging media ID)
 * @access  Bearer (Manager, Business Owner)
 */
router.post(
  '/templates/upload-header-sample',
  authorize(UserRole.BUSINESS_OWNER, UserRole.MANAGER),
  upload.single('file'),
  WhatsAppController.uploadTemplateHeaderSample
);

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
 * @route   PATCH /api/v1/whatsapp/templates/:id
 * @desc    Edit a template (Content or Default Media)
 * @access  Bearer
 */
router.patch('/templates/:id', WhatsAppController.editTemplate);

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
