import { prisma } from '../config/database.js';

export async function getDashboardOverview(organizationId: string) {
  const [
    totalContacts,
    totalConversations,
    totalMessagesSent,
    totalMessagesDelivered,
    totalMessagesRead,
    totalMessagesFailed,
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId, deletedAt: null } }),
    prisma.conversation.count({ where: { organizationId } }),
    prisma.message.count({ where: { organizationId, direction: 'OUTBOUND' } }),
    prisma.message.count({ where: { organizationId, status: 'DELIVERED' } }),
    prisma.message.count({ where: { organizationId, status: 'READ' } }),
    prisma.message.count({ where: { organizationId, status: 'FAILED' } }),
  ]);

  const deliveryRate = totalMessagesSent > 0 ? (totalMessagesDelivered / totalMessagesSent) * 100 : 0;
  const readRate = totalMessagesDelivered > 0 ? (totalMessagesRead / totalMessagesDelivered) * 100 : 0;

  return {
    totalContacts,
    totalConversations,
    totalMessagesSent,
    totalMessagesDelivered,
    totalMessagesRead,
    totalMessagesFailed,
    metrics: {
      deliveryRatePercent: Number(deliveryRate.toFixed(2)),
      readRatePercent: Number(readRate.toFixed(2)),
    },
  };
}
