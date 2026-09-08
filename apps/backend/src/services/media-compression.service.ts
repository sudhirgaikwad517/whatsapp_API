import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface CompressionResult {
  filename: string;
  url: string;
  originalSize: number;
  compressedSize: number;
  compressionRatioPercent: number;
}

export async function compressAndSaveImage(
  buffer: Buffer,
  baseUrl: string
): Promise<CompressionResult> {
  const originalSize = buffer.length;
  const fileHash = crypto.randomUUID();
  // WhatsApp's outbound "image" message type only accepts JPEG/PNG — WebP is
  // rejected outright. This pipeline's output is sent straight to customers
  // as a catalog-product image, so it must produce a format Meta will
  // actually accept, not just whatever compresses smallest.
  const filename = `compressed_${fileHash}.jpg`;
  const filePath = path.join(UPLOADS_DIR, filename);

  const compressedBuffer = await sharp(buffer)
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  await fs.promises.writeFile(filePath, compressedBuffer);

  const compressedSize = compressedBuffer.length;
  const compressionRatioPercent = Number((((originalSize - compressedSize) / originalSize) * 100).toFixed(1));
  const url = `${baseUrl.replace(/\/$/, '')}/uploads/${filename}`;

  return {
    filename,
    url,
    originalSize,
    compressedSize,
    compressionRatioPercent,
  };
}

export interface RawUploadResult {
  filename: string;
  url: string;
  size: number;
}

// For video/audio/document attachments — unlike compressAndSaveImage, these
// can't be re-encoded through Sharp (it only handles raster images), so the
// original bytes are stored as-is, just under a random filename to avoid
// collisions.
export async function saveRawFile(buffer: Buffer, originalName: string, baseUrl: string): Promise<RawUploadResult> {
  const ext = (originalName.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const filename = `raw_${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  await fs.promises.writeFile(filePath, buffer);

  const url = `${baseUrl.replace(/\/$/, '')}/uploads/${filename}`;

  return { filename, url, size: buffer.length };
}
