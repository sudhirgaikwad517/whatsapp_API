import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { logger } from '../utils/logger.js';

/**
 * Media Worker — processes incoming media downloads from WhatsApp servers.
 * Prevents main thread blocking when downloading large files (images/videos/pdfs).
 */
export const mediaWorker = new Worker(
  'media-processing',
  async (job: Job) => {
    const data = job.data;
    logger.debug({ jobId: job.id, mediaId: data.mediaId }, 'Processing media download job');

    try {
      // In a full implementation, you would:
      // 1. Fetch from Facebook Graph API (https://graph.facebook.com/v19.0/${mediaId})
      // 2. Download the binary payload
      // 3. Upload to AWS S3 / Cloud Storage
      // 4. Update the Message record in DB with the persistent URL
      
      logger.info({ mediaId: data.mediaId }, 'Media job processed successfully (Placeholder)');
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (err) {
      logger.error({ err, mediaId: data.mediaId }, 'Media download failed');
      throw err;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 5,
  }
);

mediaWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Media processing job failed');
});
