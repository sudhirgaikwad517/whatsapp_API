import { Worker } from 'bullmq';
import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { expireStaleFlowSessions } from '../services/flow-engine.service.js';

/**
 * Flow Session Sweep Queue — repeating sweep that expires ACTIVE Chatbot
 * Flow sessions nobody replied to in time, same pattern as the SLA-
 * reassignment and disappearing-messages sweeps. Without this, a customer
 * who never answers a mid-flow question would stay permanently "inside"
 * that flow — every future message they send would keep trying to resolve
 * against a question they're never going to answer, instead of falling
 * back to normal AI/keyword-bot handling.
 */
export const flowSessionSweepQueue = new Queue('flow-session-sweep', {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 200,
    attempts: 2,
  },
});

export const flowSessionSweepWorker = new Worker(
  'flow-session-sweep',
  async () => {
    const count = await expireStaleFlowSessions();
    if (count > 0) {
      logger.info({ count }, 'Expired stale Chatbot Flow sessions.');
    }
  },
  { connection: createRedisConnection(), concurrency: 1 }
);

flowSessionSweepWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Flow session sweep job failed');
});

// Schedule the repeating sweep once at process start. BullMQ dedupes
// repeatable jobs by their pattern/jobId, so this is safe on every server boot.
flowSessionSweepQueue.add('sweep', {}, { repeat: { every: 5 * 60 * 1000 }, jobId: 'flow-session-sweep-recurring' });
