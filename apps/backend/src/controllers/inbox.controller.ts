import { Response, NextFunction } from 'express';
import * as InboxService from '../services/inbox.service.js';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

function requesterOf(req: AuthenticatedRequest) {
  return { id: req.user!.userId, role: req.user!.role };
}

export async function getConversations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const status = req.query.status as string;
    const assignedAgentId = req.query.assignedAgentId as string;
    const contactId = req.query.contactId as string;
    const search = req.query.search as string;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;

    const data = await InboxService.listConversations(
      orgId,
      { status, assignedAgentId, contactId, search, page, limit },
      requesterOf(req)
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const conversationId = req.params.id;
    const data = await InboxService.getConversationMessages(conversationId, orgId, requesterOf(req));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const conversationId = req.params.id;
    const text = req.body.text;
    const data = await InboxService.sendOutboundTextMessage(orgId, conversationId, text, requesterOf(req));
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function assignAgent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const conversationId = req.params.id;
    const agentId = req.body.agentId || null;
    const data = await InboxService.assignConversation(orgId, conversationId, agentId, requesterOf(req));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function addNote(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const conversationId = req.params.id;
    const authorId = req.user!.userId;
    const content = req.body.content;
    const data = await InboxService.addInternalNote(orgId, conversationId, authorId, content, requesterOf(req));
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getNotes(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const conversationId = req.params.id;
    const data = await InboxService.getInternalNotes(conversationId, orgId, requesterOf(req));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function sendTemplate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const conversationId = req.params.id;
    const { templateName, language, components } = req.body;
    const data = await InboxService.sendOutboundTemplateMessage(
      orgId,
      conversationId,
      templateName,
      language,
      components,
      requesterOf(req)
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function sendMedia(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const conversationId = req.params.id;
    const { type, mediaUrl, filename, caption } = req.body;
    const data = await InboxService.sendOutboundMediaMessage(
      orgId,
      conversationId,
      {
        type: type || 'IMAGE',
        mediaUrl,
        filename,
        caption,
      },
      requesterOf(req)
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const orgId = req.user!.organizationId;
    const conversationId = req.params.id;
    const status = req.body.status || 'OPEN';
    const data = await InboxService.updateConversationStatus(orgId, conversationId, status, requesterOf(req));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
