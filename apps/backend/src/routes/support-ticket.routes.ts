import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as TicketController from '../controllers/support-ticket.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', TicketController.createTicket);
router.get('/', TicketController.getTickets);
router.post('/:ticketId/reply', TicketController.replyTicket);

export default router;
