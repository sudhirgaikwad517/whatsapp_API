import { Router } from 'express';
import * as CatalogController from '../controllers/catalog.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

router.get('/', CatalogController.listProducts);
router.get('/:id', CatalogController.getProduct);
router.post('/', CatalogController.createProduct);
router.put('/:id', CatalogController.updateProduct);
router.delete('/:id', CatalogController.deleteProduct);
router.post('/payment-link', CatalogController.createPaymentLink);

export default router;
