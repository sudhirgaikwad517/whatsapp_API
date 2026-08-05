import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as CatalogService from '../services/catalog.service.js';
import * as PaymentService from '../services/in-chat-payment.service.js';

export async function listProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await CatalogService.listProducts(orgId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { id } = req.params;
    const data = await CatalogService.getProductById(orgId, id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await CatalogService.createProduct(orgId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { id } = req.params;
    const data = await CatalogService.updateProduct(orgId, id, req.body);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { id } = req.params;
    const data = await CatalogService.deleteProduct(orgId, id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createPaymentLink(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { conversationId, amount, description } = req.body;
    const data = await PaymentService.createRazorpayInChatPaymentLink(orgId, conversationId, Number(amount), description);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
