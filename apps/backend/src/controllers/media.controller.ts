import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import * as MediaService from '../services/media-compression.service.js';

export async function uploadAndCompressMedia(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE_PROVIDED', message: 'Please select an image file to upload.' } });
      return;
    }

    const host = req.get('host') || 'localhost:5050';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const result = await MediaService.compressAndSaveImage(req.file.buffer, baseUrl);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function uploadRawMedia(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: { code: 'NO_FILE_PROVIDED', message: 'Please select a file to attach.' } });
      return;
    }

    const host = req.get('host') || 'localhost:5050';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const result = await MediaService.saveRawFile(req.file.buffer, req.file.originalname, baseUrl);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
