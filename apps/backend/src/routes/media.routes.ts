import { Router } from 'express';
import multer from 'multer';
import * as MediaController from '../controllers/media.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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
