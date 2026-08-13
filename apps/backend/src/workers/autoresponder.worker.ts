import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { logger } from '../utils/logger.js';

export const autoResponderWorker = new Worker(
  'autoresponder-processing',
  async (job: Job) => {
    const data = job.data;
    logger.debug({ jobId: job.id, type: data.type }, 'Processing auto-responder job');

    try {
      if (data.type === 'commerce') {
        const { createRazorpayInChatPaymentLink } = await import('../services/in-chat-payment.service.js');
        await createRazorpayInChatPaymentLink(
          data.organizationId,
          data.conversationId,
          data.priceInINR,
          `Order for ${data.title}`
        );
      } else if (data.type === 'flow') {
        const { sendOutboundTextMessage } = await import('../services/inbox.service.js');
        await sendOutboundTextMessage(data.organizationId, data.conversationId, data.text);
      } else if (data.type === 'ai') {
        const { processAutonomousAiResponse } = await import('../services/ai.service.js');
        await processAutonomousAiResponse(data.organizationId, data.conversationId);
      }
    } catch (err) {
      logger.error({ err, data }, `Auto-responder job execution failed for type ${data.type}`);
      throw err;
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 10,
  }
);

autoResponderWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Auto-responder job failed');
});
