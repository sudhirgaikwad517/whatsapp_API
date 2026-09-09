import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { redis } from '../config/redis.js';
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
      } else if (data.type === 'flow-start') {
        const { startFlowSession } = await import('../services/flow-engine.service.js');
        await startFlowSession(data.organizationId, data.conversationId, data.contactId, { id: data.flowId, definition: data.definition });
      } else if (data.type === 'flow-advance') {
        const { advanceFlowSession } = await import('../services/flow-engine.service.js');
        await advanceFlowSession(
          {
            id: data.sessionId,
            organizationId: data.organizationId,
            conversationId: data.conversationId,
            flowId: data.flowId,
            currentNodeId: data.currentNodeId,
            variables: data.variables,
          },
          { text: data.text, buttonReplyId: data.buttonReplyId, listReplyId: data.listReplyId }
        );
      } else if (data.type === 'ai') {
        const { processAutonomousAiResponse } = await import('../services/ai.service.js');
        await processAutonomousAiResponse(data.organizationId, data.conversationId);
      }
    } catch (err) {
      logger.error({ err, data }, `Auto-responder job execution failed for type ${data.type}`);
      throw err;
    } finally {
      // Release the webhook worker's debounce lock the moment this job is
      // actually done (success or failure) instead of relying purely on its
      // fixed TTL — evaluateAiAutonomousReply can chain up to 3 Gemini model
      // attempts and take longer than a short fixed window, during which a
      // customer's follow-up message would otherwise queue a second AI reply
      // job, producing duplicate/overlapping replies.
      if (data.type === 'ai' && data.conversationId) {
        try {
          await redis.del(`ai-pending:${data.conversationId}`);
        } catch {}
      }
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
