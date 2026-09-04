import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { requirePageAccess } from '../middlewares/page-access.middleware.js';
import * as cannedResponseController from '../controllers/canned-response.controller.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);
router.use(requirePageAccess('auto-reply'));

router.get('/', cannedResponseController.listCannedResponses);
router.post('/', cannedResponseController.createCannedResponse);
router.delete('/:id', cannedResponseController.deleteCannedResponse);

export default router;
