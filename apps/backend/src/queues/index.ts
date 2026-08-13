import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';

/**
 * Webhook Queue — processes all inbound Meta webhooks asynchronously.
 * Priority queue: incoming customer messages MUST NOT be blocked by campaign traffic.
 */
export const webhookQueue = new Queue('webhook-processing', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 1000,    // Keep last 1000 completed jobs for inspection
    removeOnFail: 5000,        // Keep last 5000 failed jobs for debugging
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 1000,             // 1s → 2s → 4s → 8s → 16s
    },
  },
});

/**
 * Marketing Campaign Queue — rate-limited broadcast dispatcher.
 * Concurrency is throttled to respect Meta WABA messaging tier limits.
 */
export const marketingQueue = new Queue('marketing-campaign', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 500,
    removeOnFail: 2000,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

/**
 * Media Queue — async fetches incoming WhatsApp media from Meta CDN and saves to local storage / PostgreSQL.
 */
export const mediaQueue = new Queue('media-processing', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 200,
    removeOnFail: 1000,
    attempts: 3,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
  },
});

/**
 * Auto-Responder Queue — processes AI Copilot and Keyword Chatbot flows durably.
 */
export const autoResponderQueue = new Queue('autoresponder-processing', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 5000,
    attempts: 3,
  },
});
