import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';

export interface CreateFlowInput {
  name: string;
  triggerKeyword?: string;
  definition: any;
}

export interface UpdateFlowInput {
  name?: string;
  triggerKeyword?: string;
  definition?: any;
  isActive?: boolean;
}

export async function listFlows(organizationId: string) {
  return (prisma as any).flow.findMany({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getFlowById(organizationId: string, id: string) {
  const flow = await (prisma as any).flow.findFirst({
    where: { id, organizationId },
  });
  if (!flow) throw new AppError('Flow not found.', 404, 'FLOW_NOT_FOUND');
  return flow;
}

export async function createFlow(organizationId: string, input: CreateFlowInput) {
  return (prisma as any).flow.create({
    data: {
      organizationId,
      name: input.name.trim(),
      triggerKeyword: input.triggerKeyword ? input.triggerKeyword.trim().toLowerCase() : null,
      definition: input.definition || { nodes: [], edges: [] },
      isActive: true,
    },
  });
}

export async function updateFlow(organizationId: string, id: string, input: UpdateFlowInput) {
  await getFlowById(organizationId, id);

  return (prisma as any).flow.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.triggerKeyword !== undefined ? { triggerKeyword: input.triggerKeyword ? input.triggerKeyword.trim().toLowerCase() : null } : {}),
      ...(input.definition !== undefined ? { definition: input.definition } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}

export async function deleteFlow(organizationId: string, id: string) {
  await getFlowById(organizationId, id);
  await (prisma as any).flow.delete({ where: { id } });
  return { message: 'Flow deleted successfully.' };
}

export async function evaluateInboundFlow(organizationId: string, text: string) {
  if (!text || !text.trim()) return null;
  const cleanText = text.trim().toLowerCase();

  const activeFlows = await (prisma as any).flow.findMany({
    where: { organizationId, isActive: true },
  });

  for (const flow of activeFlows) {
    if (flow.triggerKeyword && flow.triggerKeyword.toLowerCase() === cleanText) {
      return flow;
    }
  }

  return null;
}
