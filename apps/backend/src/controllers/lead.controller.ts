import { Request, Response, NextFunction } from 'express';
import * as LeadService from '../services/lead.service.js';

export async function createLead(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, phoneNumber, whatsappConsent, message, company, industry, messageVolume, source } = req.body;
    const lead = await LeadService.createLead({
      name,
      email,
      phoneNumber,
      whatsappConsent,
      message,
      company,
      industry,
      messageVolume,
      source,
    });
    res.status(201).json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
}
