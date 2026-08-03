import { Response, NextFunction } from 'express';
import * as ContactService from '../services/contact.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export async function getContacts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const search = req.query.search as string;
    const tagId = req.query.tagId as string;

    const data = await ContactService.listContacts(orgId, { page, limit, search, tagId });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createContact(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await ContactService.createContact(orgId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function importContacts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const contactsList = req.body.contacts; // JSON array of contacts parsed from CSV or request
    const data = await ContactService.bulkImportContacts(orgId, contactsList);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getTags(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const data = await ContactService.listTags(orgId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createTag(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const { name, color } = req.body;
    const data = await ContactService.createTag(orgId, name, color);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function toggleOptStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const contactId = req.params.id;
    const { isOptedIn } = req.body;
    const data = await ContactService.toggleOptStatus(orgId, contactId, Boolean(isOptedIn));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteContact(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const contactId = req.params.id;
    const data = await ContactService.deleteContact(orgId, contactId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
