import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { canonicalizeGreeting, isKnownGreeting } from './auto-responder.service.js';

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
  return prisma.flow.findMany({
    where: { organizationId },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getFlowById(organizationId: string, id: string) {
  const flow = await prisma.flow.findFirst({
    where: { id, organizationId },
  });
  if (!flow) throw new AppError('Flow not found.', 404, 'FLOW_NOT_FOUND');
  return flow;
}

export async function createFlow(organizationId: string, input: CreateFlowInput) {
  return prisma.flow.create({
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

  return prisma.flow.update({
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
  await prisma.flow.delete({ where: { id } });
  return { message: 'Flow deleted successfully.' };
}

/** Browsable list of a Flow's completed runs (data collected via "Save Data" nodes), newest first. */
export async function listFlowSubmissions(organizationId: string, flowId: string, options: { page?: number; limit?: number } = {}) {
  await getFlowById(organizationId, flowId);
  const page = options.page || 1;
  const limit = Math.min(options.limit || 50, 200);
  const skip = (page - 1) * limit;

  const [total, submissions] = await Promise.all([
    prisma.flowSubmission.count({ where: { organizationId, flowId } }),
    prisma.flowSubmission.findMany({
      where: { organizationId, flowId },
      include: { contact: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } } },
      orderBy: { completedAt: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return { submissions, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function evaluateInboundFlow(organizationId: string, text: string) {
  if (!text || !text.trim()) return null;
  const cleanText = text.trim().toLowerCase();

  const activeFlows = await prisma.flow.findMany({
    where: { organizationId, isActive: true },
  });

  for (const flow of activeFlows) {
    if (!flow.triggerKeyword) continue;
    const trigger = flow.triggerKeyword.toLowerCase();
    if (trigger === cleanText) {
      return flow;
    }
    // Tolerate common greeting misspellings/variants — a flow configured to
    // trigger on "hi" should also fire on "hey"/"hie"/"hii"/"hello" etc.,
    // not just that exact string. Only kicks in when the configured trigger
    // is itself a recognized greeting, so a non-greeting trigger like "order
    // status" is never loosened.
    if (isKnownGreeting(trigger) && canonicalizeGreeting(cleanText) === canonicalizeGreeting(trigger)) {
      return flow;
    }
  }

  return null;
}
