import { Router } from 'express';
import * as AutoResponderController from '../controllers/auto-responder.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.get('/', AutoResponderController.getRules);
router.post('/', AutoResponderController.createRule);
router.put('/:id', AutoResponderController.updateRule);
router.delete('/:id', AutoResponderController.deleteRule);

export default router;
