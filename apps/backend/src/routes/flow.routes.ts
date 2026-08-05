import { Router } from 'express';
import * as FlowController from '../controllers/flow.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.get('/', FlowController.listFlows);
router.get('/:id', FlowController.getFlow);
router.post('/', FlowController.createFlow);
router.put('/:id', FlowController.updateFlow);
router.delete('/:id', FlowController.deleteFlow);

export default router;
