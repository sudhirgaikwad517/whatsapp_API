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
    prisma.message.count({ where: { organizationId, direction: 'OUTBOUND', status: { in: ['DELIVERED', 'READ', 'REPLIED'] } } }),
    prisma.message.count({ where: { organizationId, direction: 'OUTBOUND', status: { in: ['READ', 'REPLIED'] } } }),
    prisma.message.count({ where: { organizationId, direction: 'OUTBOUND', status: 'FAILED' } }),
  ]);

  const deliveryRate = totalMessagesSent > 0 ? (totalMessagesDelivered / totalMessagesSent) * 100 : 0;
  // A read message implies it was delivered, so we calculate read rate against delivered
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

export async function getSlaAndAgentAnalytics(organizationId: string) {
  const [conversationsRaw, members] = await Promise.all([
    prisma.conversation.findMany({
      where: { organizationId },
      select: {
        id: true,
        assignedAgentId: true,
        firstResponseTimeMs: true,
        status: true,
        createdAt: true,
        resolvedAt: true,
      },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: { id: true, fullName: true, email: true },
        },
      },
    }),
  ]);

  const conversations: any[] = conversationsRaw;

  const convsWithFRT = conversations.filter((c) => c.firstResponseTimeMs !== null && c.firstResponseTimeMs !== undefined);
  const avgFRTMinutes = convsWithFRT.length > 0
    ? Number(((convsWithFRT.reduce((acc, c) => acc + (c.firstResponseTimeMs || 0), 0) / convsWithFRT.length) / 60000).toFixed(1))
    : 0;

  const resolvedConvs = conversations.filter((c) => c.resolvedAt !== null && c.createdAt !== null);
  const avgResolutionMinutes = resolvedConvs.length > 0
    ? Number(
        (
          resolvedConvs.reduce((acc, c) => {
            const resMs = new Date(c.resolvedAt!).getTime() - new Date(c.createdAt).getTime();
            return acc + Math.max(0, resMs);
          }, 0) /
          resolvedConvs.length /
          60000
        ).toFixed(1)
      )
    : 0;

  const agentLeaderboard = members.map((member) => {
    const agentConvs = conversations.filter((c) => c.assignedAgentId === member.userId);
    const agentFRTConvs = agentConvs.filter((c) => c.firstResponseTimeMs !== null && c.firstResponseTimeMs !== undefined);
    const agentAvgFRT = agentFRTConvs.length > 0
      ? Number(((agentFRTConvs.reduce((acc, c) => acc + (c.firstResponseTimeMs || 0), 0) / agentFRTConvs.length) / 60000).toFixed(1))
      : 0;

    const resolvedCount = agentConvs.filter((c) => c.status === 'CLOSED' || c.resolvedAt !== null).length;

    return {
      agentId: member.userId,
      name: member.user.fullName || 'Agent',
      email: member.user.email,
      role: member.role,
      totalAssigned: agentConvs.length,
      resolvedCount,
      avgFRTMinutes: agentAvgFRT,
    };
  });

  agentLeaderboard.sort((a, b) => b.totalAssigned - a.totalAssigned);

  return {
    avgFRTMinutes,
    avgResolutionMinutes,
    totalConversations: conversations.length,
    agentLeaderboard,
  };
}
