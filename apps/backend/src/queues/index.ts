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

/**
 * Payment Order Poll Queue — in-chat commerce (Razorpay Payment Links) has no
 * webhook back to us, since each organization uses its OWN Razorpay account
 * (not the platform's), so we can't verify a single shared webhook secret for
 * every org. Instead a repeating job polls pending orders directly against
 * Razorpay's API using that org's own stored key/secret.
 */
export const paymentOrderPollQueue = new Queue('payment-order-poll', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 200,
    attempts: 2,
  },
});

/**
 * SLA Reassignment Queue — repeating sweep that hands a conversation back to
 * the org owner if the agent it was assigned to never opened it within that
 * org's configured SLA window (Organization.slaReassignMinutes).
 */
export const slaReassignQueue = new Queue('sla-reassignment', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 200,
    attempts: 2,
  },
});
