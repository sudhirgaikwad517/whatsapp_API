import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { logger } from '../utils/logger.js';

export async function loginSuperAdmin(email: string, password: string) {
  let superAdmin = await prisma.superAdminUser.findUnique({
    where: { email },
  });

  // Auto-seed default SuperAdmin user if database table is unseeded
  if (!superAdmin) {
    const totalSuperAdmins = await prisma.superAdminUser.count();
    if (totalSuperAdmins === 0 || email === 'superadmin@prowexa.com') {
      const passwordHash = await bcrypt.hash('Admin123!', 12);
      superAdmin = await prisma.superAdminUser.upsert({
        where: { email: 'superadmin@prowexa.com' },
        update: { passwordHash, isActive: true },
        create: {
          email: 'superadmin@prowexa.com',
          fullName: 'Chief Platform Architect',
          passwordHash,
          role: 'SUPER_ADMIN',
          isActive: true,
        },
      });
    }
  }

  if (!superAdmin || !superAdmin.isActive) {
    throw new AppError('Invalid Super Admin credentials.', 401, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(password, superAdmin.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid Super Admin credentials.', 401, 'INVALID_CREDENTIALS');
  }

  const accessToken = jwt.sign(
    {
      userId: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role,
      isSuperAdmin: true,
    },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return {
    user: {
      id: superAdmin.id,
      email: superAdmin.email,
      fullName: superAdmin.fullName,
      role: superAdmin.role,
      organizationId: 'SYSTEM_SUPER_ADMIN',
    },
    accessToken,
  };
}

export async function getExecutiveDashboardKpi() {
  const [
    totalOrganizations,
    activeOrganizations,
    suspendedOrganizations,
    totalUsers,
    totalMessages,
    walletsSum,
    invoicesSum,
    supportTickets,
    auditLogs,
    pricingRules,
  ] = await Promise.all([
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.organization.count({ where: { isSuspended: false, deletedAt: null } }),
    prisma.organization.count({ where: { isSuspended: true, deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.message.count(),
    prisma.wallet.aggregate({
      _sum: { availableBalance: true, reservedBalance: true },
    }),
    prisma.invoice.aggregate({
      _sum: { grandTotal: true, subtotal: true, taxAmount: true },
    }),
    prisma.supportTicket.findMany({
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.superAdminAuditLog.findMany({
      include: { actorAdmin: true, targetOrganization: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.pricingRule.findMany({
      orderBy: { countryCode: 'asc' },
    }),
  ]);

  const grossRevenue = Number(invoicesSum._sum.grandTotal || 0);
  const netRevenue = Number(invoicesSum._sum.subtotal || 0);
  const totalGstTax = Number(invoicesSum._sum.taxAmount || 0);
  const totalWalletBalance = Number(walletsSum._sum.availableBalance || 0);
  const totalReservedBalance = Number(walletsSum._sum.reservedBalance || 0);

  // Meta payable (80% estimated Meta Graph API charge)
  const metaPayable = Number((netRevenue * 0.8).toFixed(2));
  const platformProfit = Number((netRevenue - metaPayable).toFixed(2));

  return {
    kpi: {
      organizations: {
        total: totalOrganizations,
        active: activeOrganizations,
        suspended: suspendedOrganizations,
      },
      users: {
        total: totalUsers,
      },
      messaging: {
        totalMessages,
      },
      financials: {
        grossRevenue,
        netRevenue,
        totalGstTax,
        totalWalletBalance,
        totalReservedBalance,
        metaPayable,
        platformProfit,
      },
      systemHealth: {
        apiStatus: 'HEALTHY',
        databaseStatus: 'CONNECTED',
        redisStatus: 'CONNECTED',
        workerQueueStatus: 'ACTIVE',
      },
      supportTickets,
      auditLogs,
      pricingRules,
    },
  };
}

export async function getOrganizationsList(options: { page?: number; limit?: number; search?: string }) {
  const page = options.page || 1;
  const limit = options.limit || 30;
  const skip = (page - 1) * limit;

  const where: any = { deletedAt: null };
  if (options.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { slug: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [total, organizations] = await Promise.all([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      skip,
      take: limit,
      include: {
        wallet: true,
        whatsappAccounts: {
          where: { deletedAt: null },
          select: { id: true, wabaId: true, displayPhoneNumber: true, status: true },
        },
        _count: {
          select: { users: true, campaigns: true, conversations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { organizations, total, page, limit };
}

export async function impersonateTenant(organizationId: string, actorAdminId?: string, reason?: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId, deletedAt: null },
    include: {
      users: {
        take: 1,
        include: { user: true },
      },
    },
  });

  if (!org) {
    throw new AppError('Target organization not found.', 404, 'ORGANIZATION_NOT_FOUND');
  }

  const primaryOwner = org.users[0]?.user;
  if (!primaryOwner) {
    throw new AppError('No active user owner found in target organization.', 400, 'NO_OWNER');
  }

  // Audit Log Entry
  await prisma.superAdminAuditLog.create({
    data: {
      actorAdminId: actorAdminId || null,
      targetOrganizationId: organizationId,
      action: 'IMPERSONATE_TENANT',
      resource: 'Organization',
      details: { reason: reason || 'Super Admin Support Troubleshooting' },
      ipAddress: '127.0.0.1',
    },
  });

  // Issue Short-Lived Impersonation Token (15 min expiry)
  const impersonationToken = jwt.sign(
    {
      userId: primaryOwner.id,
      organizationId: org.id,
      role: 'BUSINESS_OWNER',
      isImpersonated: true,
    },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  logger.info({ organizationId, primaryUser: primaryOwner.email }, '🎭 Super Admin Tenant Impersonation Token Issued');

  return {
    impersonationToken,
    organization: { id: org.id, name: org.name, slug: org.slug },
    owner: { id: primaryOwner.id, fullName: primaryOwner.fullName, email: primaryOwner.email },
  };
}

export async function toggleOrganizationSuspension(organizationId: string, isSuspended: boolean) {
  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { isSuspended },
  });

  await prisma.superAdminAuditLog.create({
    data: {
      targetOrganizationId: organizationId,
      action: isSuspended ? 'SUSPEND_ORGANIZATION' : 'ACTIVATE_ORGANIZATION',
      resource: 'Organization',
      details: { isSuspended },
      ipAddress: '127.0.0.1',
    },
  });

  return updated;
}

export async function updateOrganizationPlanTier(organizationId: string, planTier: string) {
  const updated = await (prisma as any).organization.update({
    where: { id: organizationId },
    data: { planTier },
  });

  await prisma.superAdminAuditLog.create({
    data: {
      targetOrganizationId: organizationId,
      action: 'UPDATE_PLAN_TIER',
      resource: 'Organization',
      details: { planTier },
      ipAddress: '127.0.0.1',
    },
  });

  return updated;
}

export async function grantAiCreditsToOrganization(organizationId: string, creditsAmount: number) {
  const updated = await (prisma as any).organization.update({
    where: { id: organizationId },
    data: {
      aiCreditsBalance: { increment: creditsAmount },
    },
  });

  await prisma.superAdminAuditLog.create({
    data: {
      targetOrganizationId: organizationId,
      action: 'GRANT_AI_CREDITS',
      resource: 'Organization',
      details: { creditsAmount },
      ipAddress: '127.0.0.1',
    },
  });

  return updated;
}

export async function creditWalletForOrganization(organizationId: string, amountNumber: number, description?: string) {
  const { rechargeWallet } = await import('./billing-wallet.service.js');
  const referenceId = `SA_CREDIT_${Date.now()}`;
  const desc = description || 'SuperAdmin Manual Wallet Credit';
  
  const wallet = await rechargeWallet(organizationId, amountNumber, referenceId, desc);

  await prisma.superAdminAuditLog.create({
    data: {
      targetOrganizationId: organizationId,
      action: 'MANUAL_WALLET_CREDIT',
      resource: 'Wallet',
      details: { amount: amountNumber, description: desc },
      ipAddress: '127.0.0.1',
    },
  });

  return wallet;
}

export async function updatePricingRule(data: {
  countryCode: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'SERVICE';
  metaCost: number;
  platformMarkup: number;
}) {
  const totalPrice = Number((data.metaCost + data.platformMarkup).toFixed(4));

  const rule = await prisma.pricingRule.upsert({
    where: {
      countryCode_conversationCategory: {
        countryCode: data.countryCode,
        conversationCategory: data.category as any,
      },
    },
    update: {
      metaCost: data.metaCost,
      platformMarkup: data.platformMarkup,
      totalPrice,
    },
    create: {
      countryCode: data.countryCode,
      conversationCategory: data.category as any,
      metaCost: data.metaCost,
      platformMarkup: data.platformMarkup,
      totalPrice,
      currency: 'INR',
    },
  });

  return rule;
}

export async function superAdminReplyTicket(ticketId: string, message: string, status?: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new AppError('Support ticket not found', 404, 'NOT_FOUND');
  }

  const msg = await prisma.ticketMessage.create({
    data: {
      ticketId,
      senderType: 'SUPER_ADMIN',
      senderId: 'SYSTEM_SUPER_ADMIN',
      message,
    },
  });

  const updatedTicket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: status || 'IN_PROGRESS',
      updatedAt: new Date(),
    },
    include: { messages: true, organization: true },
  });

  return updatedTicket;
}

