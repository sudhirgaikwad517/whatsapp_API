import { Response } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as cannedResponseService from '../services/canned-response.service.js';

export async function listCannedResponses(req: AuthenticatedRequest, res: Response) {
  try {
    const list = await cannedResponseService.listCannedResponses(req.user!.organizationId);
    return res.status(200).json({ status: 'success', data: list });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      status: 'error',
      error: { message: error.message, code: error.errorCode || 'INTERNAL_ERROR' },
    });
  }
}

export async function createCannedResponse(req: AuthenticatedRequest, res: Response) {
  try {
    const item = await cannedResponseService.createCannedResponse(req.user!.organizationId, req.body);
    return res.status(201).json({ status: 'success', data: item });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      status: 'error',
      error: { message: error.message, code: error.errorCode || 'INTERNAL_ERROR' },
    });
  }
}

export async function deleteCannedResponse(req: AuthenticatedRequest, res: Response) {
  try {
    const result = await cannedResponseService.deleteCannedResponse(req.user!.organizationId, req.params.id);
    return res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      status: 'error',
      error: { message: error.message, code: error.errorCode || 'INTERNAL_ERROR' },
    });
  }
}
