import { prisma } from '../config/database.js';
import { AppError } from './error-handler.middleware.js';

export interface PlanLimits {
  maxAgents: number;
  maxActiveFlows: number;
  maxCatalogItems: number;
  aiCopilotEnabled: boolean;
  maxWabaAccounts: number;
}

export const PLAN_LIMITS_MAP: Record<string, PlanLimits> = {
  STARTER: {
    maxAgents: 2,
    maxActiveFlows: 2,
    maxCatalogItems: 20,
    aiCopilotEnabled: false,
    maxWabaAccounts: 1,
  },
  PRO: {
    maxAgents: 5,
    maxActiveFlows: 999,
    maxCatalogItems: 9999,
    aiCopilotEnabled: true,
    maxWabaAccounts: 1,
  },
  ENTERPRISE: {
    maxAgents: 15,
    maxActiveFlows: 9999,
    maxCatalogItems: 99999,
    aiCopilotEnabled: true,
    maxWabaAccounts: 3,
  },
};

export async function checkAgentLimit(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { planTier: true },
  });

  const tier = org?.planTier || 'PRO';
  const limits = PLAN_LIMITS_MAP[tier] || PLAN_LIMITS_MAP.PRO;

  const currentAgents = await prisma.organizationMember.count({
    where: { organizationId },
  });

  if (currentAgents >= limits.maxAgents) {
    throw new AppError(
      `Agent seat limit reached (${currentAgents}/${limits.maxAgents}) for ${tier} Plan. Please upgrade your subscription to add more agents.`,
      403,
      'AGENT_LIMIT_EXCEEDED'
    );
  }
}

export async function checkFlowLimit(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { planTier: true },
  });

  const tier = org?.planTier || 'PRO';
  const limits = PLAN_LIMITS_MAP[tier] || PLAN_LIMITS_MAP.PRO;

  const activeFlows = await prisma.flow.count({
    where: { organizationId, isActive: true },
  });

  if (activeFlows >= limits.maxActiveFlows) {
    throw new AppError(
      `Active Chatbot Flow limit reached (${activeFlows}/${limits.maxActiveFlows}) for ${tier} Plan. Please upgrade to Pro or Enterprise for unlimited flows.`,
      403,
      'FLOW_LIMIT_EXCEEDED'
    );
  }
}

export async function checkCatalogLimit(organizationId: string): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { planTier: true },
  });

  const tier = org?.planTier || 'PRO';
  const limits = PLAN_LIMITS_MAP[tier] || PLAN_LIMITS_MAP.PRO;

  const currentProducts = await prisma.productCatalog.count({
    where: { organizationId },
  });

  if (currentProducts >= limits.maxCatalogItems) {
    throw new AppError(
      `Product Catalog item limit reached (${currentProducts}/${limits.maxCatalogItems}) for ${tier} Plan. Please upgrade your subscription to add more products.`,
      403,
      'CATALOG_LIMIT_EXCEEDED'
    );
  }
}
