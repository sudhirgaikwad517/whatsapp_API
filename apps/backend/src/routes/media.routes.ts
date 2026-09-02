import { Router } from 'express';
import multer from 'multer';
import * as MediaController from '../controllers/media.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { AppError } from '../middlewares/error-handler.middleware.js';

// This endpoint compresses everything through sharp (see media-compression.service.ts),
// which only handles raster images — keep the allow-list to what sharp can actually process.
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new AppError(`Unsupported file type: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF images are accepted.`, 400, 'UNSUPPORTED_FILE_TYPE'));
    }
    cb(null, true);
  },
});

const router = Router();

router.use(authenticate);
router.use(tenantContext);

/**
 * @route   POST /api/v1/media/upload
 * @desc    Upload product image or campaign header media, compress via Sharp.js to WebP (80% space saving)
 * @access  Bearer
 */
router.post('/upload', upload.single('file'), MediaController.uploadAndCompressMedia);

export default router;
