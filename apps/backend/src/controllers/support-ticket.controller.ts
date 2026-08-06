import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as TicketService from '../services/support-ticket.service.js';

export async function createTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const data = await TicketService.createSupportTicket(orgId, userId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getTickets(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await TicketService.listClientSupportTickets(orgId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function replyTicket(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const userId = req.user!.userId;
    const { ticketId } = req.params;
    const { message } = req.body;
    const data = await TicketService.addMessageToTicket(orgId, userId, ticketId, message);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
