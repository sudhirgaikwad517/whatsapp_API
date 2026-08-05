import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as cannedResponseController from '../controllers/canned-response.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', cannedResponseController.listCannedResponses);
router.post('/', cannedResponseController.createCannedResponse);
router.delete('/:id', cannedResponseController.deleteCannedResponse);

export default router;
