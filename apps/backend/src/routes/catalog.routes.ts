import { Router } from 'express';
import * as CatalogController from '../controllers/catalog.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { tenantContext } from '../middlewares/tenant.middleware.js';
import { requirePageAccess } from '../middlewares/page-access.middleware.js';

const router = Router();

router.use(authenticate);
router.use(tenantContext);

// Reading the catalog and requesting an in-chat payment are also used from
// the Inbox page (product picker, "Request Payment") — low-sensitivity reads
// and a conversation-scoped action, so these are deliberately NOT gated
// behind 'catalog' page access; only actually managing products is.
router.get('/', CatalogController.listProducts);
router.get('/:id', CatalogController.getProduct);
router.post('/payment-link', CatalogController.createPaymentLink);

router.post('/', requirePageAccess('catalog'), CatalogController.createProduct);
router.put('/:id', requirePageAccess('catalog'), CatalogController.updateProduct);
router.delete('/:id', requirePageAccess('catalog'), CatalogController.deleteProduct);

export default router;
