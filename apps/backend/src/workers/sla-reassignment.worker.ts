import { Worker } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { slaReassignQueue } from '../queues/index.js';
import { emitToOrganization } from '../socket/inbox.gateway.js';
import { notifyAgentOfEscalation } from '../services/agent-notification.service.js';

async function reassignStaleConversations(): Promise<void> {
  const orgs = await prisma.organization.findMany({
    where: { slaReassignMinutes: { not: null }, deletedAt: null },
    select: { id: true, slaReassignMinutes: true },
  });

  for (const org of orgs) {
    const minutes = org.slaReassignMinutes;
    if (!minutes || minutes <= 0) continue;
    const staleBefore = new Date(Date.now() - minutes * 60 * 1000);

    const owner = await prisma.organizationMember.findFirst({
      where: { organizationId: org.id, role: 'BUSINESS_OWNER' },
      select: { userId: true },
    });
    if (!owner) continue;

    const staleConversations = await prisma.conversation.findMany({
      where: {
        organizationId: org.id,
        status: { in: ['OPEN', 'ESCALATED'] },
        assignedAgentId: { not: null, notIn: [owner.userId] },
        agentOpenedAt: null,
        assignedAt: { lt: staleBefore },
      },
      select: { id: true },
    });

    for (const convo of staleConversations) {
      try {
        await prisma.conversation.update({
          where: { id: convo.id },
          data: { assignedAgentId: owner.userId, assignedAt: new Date(), agentOpenedAt: null },
        });

        emitToOrganization(org.id, 'conversation_reassigned', { conversationId: convo.id, reason: 'SLA_TIMEOUT' });
        void notifyAgentOfEscalation(org.id, owner.userId, convo.id);

        logger.info(
          { organizationId: org.id, conversationId: convo.id, slaMinutes: minutes },
          'Conversation auto-reassigned to org owner — assigned agent did not open it within the SLA window.'
        );
      } catch (err) {
        logger.error({ organizationId: org.id, conversationId: convo.id, err }, 'Failed to auto-reassign stale conversation.');
      }
    }
  }
}

export const slaReassignWorker = new Worker(
  'sla-reassignment',
  async () => {
    await reassignStaleConversations();
  },
  { connection: createRedisConnection(), concurrency: 1 }
);

slaReassignWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'SLA reassignment job failed');
});

// Schedule the repeating sweep once at process start. BullMQ dedupes
// repeatable jobs by their pattern/jobId, so this is safe on every server boot.
slaReassignQueue.add('sweep', {}, { repeat: { every: 5 * 60 * 1000 }, jobId: 'sla-reassignment-recurring' });
