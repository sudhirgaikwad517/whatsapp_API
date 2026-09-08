import { Worker, Job } from 'bullmq';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRedisConnection } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';
import { decryptToken } from '../utils/encryption.js';
import { env } from '../config/env.js';
import { emitToOrganization } from '../socket/inbox.gateway.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Meta's mime_type values map cleanly onto a file extension for the common
// cases; anything else falls back to its subtype name so the file at least
// gets a sane-looking extension instead of none.
const MIME_EXT_OVERRIDES: Record<string, string> = {
  jpeg: 'jpg',
  'vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  msword: 'doc',
  'vnd.ms-excel': 'xls',
  plain: 'txt',
};

function extensionFromMime(mime: string | undefined): string {
  const subtype = (mime || '').split(';')[0].split('/')[1] || 'bin';
  return MIME_EXT_OVERRIDES[subtype] || subtype.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin';
}

/**
 * Media Worker — downloads inbound WhatsApp media (image/audio/video/
 * document) from Meta and persists it locally so it can actually be
 * rendered/played/downloaded in the Live Inbox. Meta only gives a
 * short-lived media ID in the webhook payload, not a direct URL — the
 * real URL has to be resolved via the Graph API and the binary fetched
 * with the same bearer token before it expires.
 */
export const mediaWorker = new Worker(
  'media-processing',
  async (job: Job) => {
    const { messageId, mediaId, accessToken, organizationId } = job.data;
    logger.debug({ jobId: job.id, mediaId }, 'Processing media download job');

    const token = env.META_SYSTEM_USER_TOKEN || decryptToken(accessToken);

    // 1. Resolve the temporary CDN URL for this media ID.
    const metaRes = await fetch(`${env.META_GRAPH_BASE_URL}/${env.META_API_VERSION}/${mediaId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const metaData = (await metaRes.json()) as any;
    if (!metaRes.ok || !metaData?.url) {
      logger.error({ mediaId, metaData }, 'Failed to resolve Meta media URL');
      throw new Error(metaData?.error?.message || 'Failed to resolve Meta media URL');
    }

    // 2. Download the actual binary — Meta's media URLs require the same
    // bearer token, they are not publicly fetchable.
    const downloadRes = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!downloadRes.ok) {
      logger.error({ mediaId, status: downloadRes.status }, 'Failed to download Meta media binary');
      throw new Error(`Failed to download media binary (status ${downloadRes.status})`);
    }
    const buffer = Buffer.from(await downloadRes.arrayBuffer());

    // 3. Persist locally under the same /uploads volume everything else uses.
    const ext = extensionFromMime(metaData.mime_type);
    const filename = `inbound_${crypto.randomUUID()}.${ext}`;
    await fs.promises.writeFile(path.join(UPLOADS_DIR, filename), buffer);
    const mediaUrl = `${env.API_BASE_URL.replace(/\/$/, '')}/uploads/${filename}`;

    // 4. Attach the URL to the already-saved Message row and notify the
    // Inbox UI so it re-fetches and renders the media instead of the
    // "[Media Content]" placeholder it shows while mediaUrl is absent.
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      logger.warn({ messageId, mediaId }, 'Message no longer exists — dropping downloaded media');
      return;
    }

    const updatedContent = { ...((message.content as Record<string, any>) || {}), mediaUrl, mimeType: metaData.mime_type };
    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content: updatedContent },
    });

    emitToOrganization(organizationId, 'message_status_update', {
      conversationId: updated.conversationId,
      message: updated,
    });

    logger.info({ mediaId, messageId, filename }, 'Inbound media downloaded and attached to message');
  },
  {
    connection: createRedisConnection(),
    concurrency: 5,
  }
);

mediaWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, mediaId: job?.data?.mediaId, err }, 'Media processing job failed');
});
