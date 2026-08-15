import { Response, NextFunction } from 'express';
import * as MetaService from '../services/meta-whatsapp.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/database.js';

export async function connectAccount(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const result = await MetaService.connectWhatsAppAccount(orgId, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getAccountHealth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const account = await prisma.whatsappAccount.findFirst({
      where: { organizationId: orgId, deletedAt: null },
      select: {
        id: true,
        wabaId: true,
        phoneNumberId: true,
        displayPhoneNumber: true,
        qualityRating: true,
        messagingLimitTier: true,
        status: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ success: true, data: account });
  } catch (err) {
    next(err);
  }
}

export async function syncTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const result = await MetaService.syncMetaTemplates(orgId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getTemplates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const result = await MetaService.getTemplates(orgId);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function embeddedSignup(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const result = await MetaService.processEmbeddedSignup(orgId, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function createTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const result = await MetaService.createMetaTemplate(orgId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function uploadMedia(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ success: false, error: { message: 'No file uploaded.' } });
    }
    const result = await MetaService.uploadMediaToMeta(orgId, file);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
