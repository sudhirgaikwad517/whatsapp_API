import { Worker } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { disappearingMessagesQueue } from '../queues/index.js';
import { emitToOrganization } from '../socket/inbox.gateway.js';

/**
 * WhatsApp-style disappearing messages — deletes messages that have aged
 * past their conversation's configured disappearingMessagesSeconds. Only
 * ever affects conversations that opted in; everything else is untouched.
 */
async function sweepExpiredMessages(): Promise<void> {
  const conversations = await prisma.conversation.findMany({
    where: { disappearingMessagesSeconds: { not: null, gt: 0 } },
    select: { id: true, organizationId: true, disappearingMessagesSeconds: true },
  });

  for (const convo of conversations) {
    const seconds = convo.disappearingMessagesSeconds;
    if (!seconds || seconds <= 0) continue;
    const cutoff = new Date(Date.now() - seconds * 1000);

    try {
      const { count } = await prisma.message.deleteMany({
        where: { conversationId: convo.id, createdAt: { lt: cutoff } },
      });

      if (count > 0) {
        emitToOrganization(convo.organizationId, 'conversation_cleared', { conversationId: convo.id });
        logger.info({ conversationId: convo.id, deleted: count }, 'Disappearing messages swept from conversation.');
      }
    } catch (err) {
      logger.error({ conversationId: convo.id, err }, 'Failed to sweep disappearing messages for conversation.');
    }
  }
}

export const disappearingMessagesWorker = new Worker(
  'disappearing-messages',
  async () => {
    await sweepExpiredMessages();
  },
  { connection: createRedisConnection(), concurrency: 1 }
);

disappearingMessagesWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Disappearing messages sweep job failed');
});

// Schedule the repeating sweep once at process start. BullMQ dedupes
// repeatable jobs by their pattern/jobId, so this is safe on every server boot.
disappearingMessagesQueue.add('sweep', {}, { repeat: { every: 10 * 60 * 1000 }, jobId: 'disappearing-messages-recurring' });
