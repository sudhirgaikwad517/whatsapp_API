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
  const filename = `compressed_${fileHash}.webp`;
  const filePath = path.join(UPLOADS_DIR, filename);

  const compressedBuffer = await sharp(buffer)
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
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
