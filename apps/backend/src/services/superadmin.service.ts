import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PlanTier, SupportTicketStatus, ConversationCategory } from '@prisma/client';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { logger } from '../utils/logger.js';
import { getTemplateSentCounts, getPricingRates } from './usage-metrics.service.js';
import { encryptToken } from '../utils/encryption.js';
import { sendMail, buildPasswordResetEmail } from '../utils/mailer.js';

const BCRYPT_ROUNDS = 12;

export async function loginSuperAdmin(email: string, password: string) {
  const superAdmin = await prisma.superAdminUser.findUnique({
    where: { email },
  });

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

export async function forgotSuperAdminPassword(email: string) {
  const superAdmin = await prisma.superAdminUser.findUnique({ where: { email } });
  // Always respond generically to prevent email enumeration
  const generic = { message: 'If this email is registered, a reset link has been sent.' };
  if (!superAdmin || !superAdmin.isActive) {
    return generic;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.superAdminUser.update({
    where: { id: superAdmin.id },
    data: { resetToken, resetTokenExpiry },
  });

  const resetUrl = `${env.ADMIN_PANEL_URL.replace(/\/$/, '')}/superadmin/reset-password?token=${resetToken}`;
  try {
    await sendMail({
      to: superAdmin.email,
      subject: 'Reset your Prowexa Super Admin password',
      html: buildPasswordResetEmail(resetUrl),
    });
  } catch (err) {
    logger.error({ superAdminId: superAdmin.id, err }, 'Failed to send super admin password reset email.');
  }

  return generic;
}

export async function resetSuperAdminPassword(token: string, newPassword: string) {
  const superAdmin = await prisma.superAdminUser.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
  });
  if (!superAdmin) {
    throw new AppError('Invalid or expired reset token.', 400, 'INVALID_RESET_TOKEN');
  }
  if (!newPassword || newPassword.length < 12 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    throw new AppError('Password must be at least 12 characters and include an uppercase letter and a number.', 400, 'WEAK_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.superAdminUser.update({
    where: { id: superAdmin.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });

  logger.info({ superAdminId: superAdmin.id }, 'Super Admin password reset completed.');
  return { message: 'Password has been reset successfully. Please log in with your new password.' };
}

export async function getExecutiveDashboardKpi(timeRange: string = 'all') {
  let startDate: Date | undefined;
  const now = new Date();

  if (timeRange === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (timeRange === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeRange === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (timeRange === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1);
  }

  const dateFilter = startDate ? { createdAt: { gte: startDate } } : {};

  const [
    totalOrganizations,
    activeOrganizations,
    suspendedOrganizations,
    totalUsers,
    totalMessages,
    walletsSum,
    planInvoicesSum,
    aiCreditsInvoicesSum,
    messagingInvoicesSum,
    allLedgerDebits,
    supportTickets,
    auditLogs,
    pricingRules,
  ] = await Promise.all([
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.organization.count({ where: { isSuspended: false, deletedAt: null } }),
    prisma.organization.count({ where: { isSuspended: true, deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.message.count({ where: { ...dateFilter } }),
    prisma.wallet.aggregate({
      _sum: { availableBalance: true, reservedBalance: true },
    }),
    prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: { invoiceNumber: { startsWith: 'INV-PLAN-' }, ...dateFilter },
    }),
    prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: { invoiceNumber: { startsWith: 'INV-AI-' }, ...dateFilter },
    }),
    prisma.invoice.aggregate({
      _sum: { grandTotal: true },
      where: { invoiceNumber: { startsWith: 'INV-USG-' }, ...dateFilter },
    }),
    prisma.walletLedger.aggregate({
      _sum: { amount: true },
      where: { transactionType: { in: ['DEBIT', 'MANUAL_DEBIT'] }, ...dateFilter },
    }),
    prisma.supportTicket.findMany({
      include: { organization: true, messages: { orderBy: { createdAt: 'asc' } } },
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

  const billedUsageSum = Number(allLedgerDebits._sum?.amount || 0);
  const totalReservedBalance = Number(walletsSum._sum.reservedBalance || 0);

  // Query actual client paid recharges & top-ups (excluding promotional bonus)
  const paidRechargesSum = await prisma.walletLedger.aggregate({
    _sum: { amount: true },
    where: { transactionType: { in: ['RECHARGE', 'MANUAL_CREDIT'] }, ...dateFilter },
  });
  const actualPaidRecharges = Number(paidRechargesSum._sum?.amount || 0);

  // Reads from the SuperAdmin's Pricing Rules & Markups tab (falls back to
  // the historical India rate card for any category not yet configured).
  const rates = await getPricingRates(prisma);

  // Fetch real-time Meta Graph API analytics & actual delivered charges.
  // metaDelivered* start out DB-derived (only what Prowexa itself sent) so
  // there's always a number even if the live call below fails entirely —
  // but that DB count is blind to anything sent on the same WABA outside
  // Prowexa (a direct test send from Meta Business Manager, another tool,
  // etc.), so it's overwritten with Meta's own per-category conversation
  // counts/costs whenever the live call succeeds for at least one account.
  const metaAnalytics = {
    metaDeliveredMarketing: 0,
    metaDeliveredUtility: 0,
    metaDeliveredService: 0,
    actualMetaCostInINR: 0,
  };

  try {
    const { decryptToken } = await import('../utils/encryption.js');
    const axios = (await import('axios')).default;
    const accounts = await prisma.whatsappAccount.findMany({
      where: { status: 'CONNECTED', deletedAt: null },
    });

    const inboundCount = await prisma.message.count({ where: { direction: 'INBOUND', ...dateFilter } });

    const { marketingSent, utilitySent: finalUtilityCount } = await getTemplateSentCounts(prisma, { startDate });

    metaAnalytics.metaDeliveredMarketing = marketingSent;
    metaAnalytics.metaDeliveredUtility = finalUtilityCount;
    metaAnalytics.metaDeliveredService = inboundCount;

    let liveCostSum = 0;
    let liveMarketingCount = 0;
    let liveUtilityCount = 0;
    let liveServiceCount = 0;
    let gotLiveData = false;

    for (const acc of accounts) {
      if (acc.encryptedAccessToken) {
        try {
          const token = env.META_SYSTEM_USER_TOKEN || decryptToken(acc.encryptedAccessToken);
          // Match the same window this KPI call is scoped to — 30 days back
          // when no explicit range was requested (startDate undefined), else
          // from startDate to now.
          const startTime = Math.floor((startDate ? startDate.getTime() : Date.now() - 30 * 86400 * 1000) / 1000);
          const endTime = Math.floor(Date.now() / 1000);
          const phoneDigits = (acc.displayPhoneNumber || '').replace(/\D/g, '');

          // Conversation Analytics — the current WhatsApp Business Platform
          // endpoint for real per-category conversation counts & costs,
          // reflecting Meta's actual bill for this WABA regardless of which
          // tool sent the message. The old `analytics` field this replaced
          // was deprecated by Meta and always failed silently here, which is
          // why this dashboard could show ₹0 even when Meta had genuinely
          // billed the account.
          const res = await axios.get(
            `https://graph.facebook.com/v20.0/${acc.wabaId}` +
              `?fields=conversation_analytics.start(${startTime}).end(${endTime}).granularity(DAILY)` +
              `.phone_numbers(["${phoneDigits}"]).dimensions(["conversation_category"])` +
              `&access_token=${token}`,
            { timeout: 6000 }
          );

          const dataPoints = res.data?.conversation_analytics?.data?.flatMap((entry: any) => entry.data_points || []) || [];
          for (const dp of dataPoints) {
            liveCostSum += Number(dp.cost || 0);
            const category = String(dp.conversation_category || '').toUpperCase();
            const count = Number(dp.conversation || 0);
            if (category === 'MARKETING') liveMarketingCount += count;
            else if (category === 'UTILITY') liveUtilityCount += count;
            else if (category === 'SERVICE') liveServiceCount += count;
          }
          // Only trust this as real data if it actually resolved to a
          // non-zero signal — a 200 response whose data_points don't carry
          // conversation_category in the exact shape/values expected here
          // (an undocumented Graph API change, a dimension Meta silently
          // dropped, etc.) would otherwise silently zero out an otherwise-
          // correct DB-derived fallback below, which is worse than not
          // having "live" data at all.
          if (liveMarketingCount > 0 || liveUtilityCount > 0 || liveServiceCount > 0 || liveCostSum > 0) {
            gotLiveData = true;
          }
        } catch {
          // Graceful fallback to exact Meta India Rate Card for this account
        }
      }
    }

    if (gotLiveData) {
      metaAnalytics.metaDeliveredMarketing = liveMarketingCount;
      metaAnalytics.metaDeliveredUtility = liveUtilityCount;
      metaAnalytics.metaDeliveredService = liveServiceCount;
    }

    metaAnalytics.actualMetaCostInINR = gotLiveData
      ? Number(liveCostSum.toFixed(2))
      : Number((metaAnalytics.metaDeliveredMarketing * rates.marketingMetaCost + metaAnalytics.metaDeliveredUtility * rates.utilityMetaCost).toFixed(2));
  } catch {
    // Graceful fallback
  }

  const clientBilledCalculated = Number((metaAnalytics.metaDeliveredMarketing * rates.marketingClientPrice + metaAnalytics.metaDeliveredUtility * rates.utilityClientPrice).toFixed(2));
  const totalBilledUsage = Math.max(billedUsageSum, clientBilledCalculated);
  
  const planRevenue = Number(planInvoicesSum._sum.grandTotal || 0);
  const aiCreditsRevenue = Number(aiCreditsInvoicesSum._sum.grandTotal || 0);
  const messagingRevenue = Number(messagingInvoicesSum._sum.grandTotal || 0);

  // Gross Platform Revenue is max of (Client Paid Recharges, Total Billed Messaging Usage, Paid Invoices)
  const totalInvoicesSum = planRevenue + aiCreditsRevenue + messagingRevenue;
  const grossRevenue = Number(Math.max(actualPaidRecharges, totalBilledUsage, totalInvoicesSum).toFixed(2));

  const totalGstTax = Number((grossRevenue * 0.18 / 1.18).toFixed(2));
  const netRevenue = Number((grossRevenue - totalGstTax).toFixed(2));

  // Exact Meta Payable Liability & Real Net Platform Profit Margin
  const metaPayable = metaAnalytics.actualMetaCostInINR > 0
    ? metaAnalytics.actualMetaCostInINR
    : Number((metaAnalytics.metaDeliveredMarketing * rates.marketingMetaCost + metaAnalytics.metaDeliveredUtility * rates.utilityMetaCost).toFixed(2));

  // Meta cost is a COGS against messaging revenue ONLY — it has nothing to
  // do with Plans or AI Credits revenue, which carry no Meta messaging cost
  // at all. Subtracting metaPayable from the combined grossRevenue (as this
  // used to do) buried that fact inside one lump number: a period where
  // Meta cost genuinely exceeds messaging revenue (messaging running at a
  // real loss, entirely subsidized by Plans/AI Credits sales) looked
  // identical to a healthy, evenly-profitable platform, since Plans/AI
  // revenue silently absorbed the shortfall in the total. Each revenue
  // stream's margin is now computed against only its own cost (Plans and AI
  // Credits carry none tracked here, so their revenue *is* their margin),
  // and platformProfit is their explicit sum — same total as before when
  // totalInvoicesSum happens to be grossRevenue's max, but now composed of
  // parts that are individually meaningful instead of one opaque figure.
  const messagingMargin = Number((totalBilledUsage - metaPayable).toFixed(2));
  const plansMargin = planRevenue;
  const aiCreditsMargin = aiCreditsRevenue;
  const platformProfit = Number((plansMargin + aiCreditsMargin + messagingMargin).toFixed(2));

  // Fix: Calculate Dynamic Total Client Wallet Balance (Raw DB - Global Unbilled Charges)
  const globalUnbilledCharges = Math.max(0, clientBilledCalculated - billedUsageSum);
  const rawTotalWalletBalance = Number(walletsSum._sum.availableBalance || 0);
  const totalWalletBalance = rawTotalWalletBalance - globalUnbilledCharges;

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
        planRevenue,
        aiCreditsRevenue,
        messagingRevenue,
        // Total actually billed to clients for messaging usage — ledger
        // debits (real charges applied, including ones not yet wrapped into
        // a fresh recharge invoice) vs. a current-rate estimate from
        // delivered message counts, whichever is higher. messagingRevenue
        // above only reflects usage that happened to get invoiced at a
        // recharge event, which understates real usage between recharges;
        // this is the figure messagingMargin below is actually computed
        // against, and the one that should be shown alongside it.
        messagingRevenueBilled: totalBilledUsage,
        totalGstTax,
        totalWalletBalance,
        totalReservedBalance,
        metaPayable,
        platformProfit,
        // Per-revenue-stream margin breakdown — see platformProfit's comment
        // above. messagingMargin can be negative (messaging genuinely
        // running at a loss); plansMargin/aiCreditsMargin currently equal
        // their revenue 1:1 since no separate COGS is tracked for either.
        messagingMargin,
        plansMargin,
        aiCreditsMargin,
        metaAnalytics,
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

  // Fetched once for the whole page, not per-org — this is a platform-wide
  // rate, and the org list can return up to `limit` rows.
  const rates = await getPricingRates(prisma);

  const orgsWithFinancials = await Promise.all(
    organizations.map(async (org) => {
      // Query actual ledger debits strictly per-organization without leakage
      const [ledgerDebitsSum, latestPlanInvoice] = await Promise.all([
        prisma.walletLedger.aggregate({
          _sum: { amount: true },
          where: {
            organizationId: org.id,
            transactionType: { in: ['DEBIT', 'MANUAL_DEBIT'] },
          },
        }),
        // The current plan's start date isn't stored on Organization directly —
        // derive it from the most recent plan-purchase invoice instead of adding
        // a new column for it.
        prisma.invoice.findFirst({
          where: { organizationId: org.id, invoiceNumber: { startsWith: 'INV-PLAN-' } },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      const { marketingSent, utilitySent } = await getTemplateSentCounts(prisma, { organizationId: org.id });

      // DB-derived estimate only — this list can return up to `limit` rows,
      // so a live per-row Meta Graph API call here (as this used to do)
      // meant up to `limit` outbound HTTP requests on every single page
      // load. Live Meta data for one specific org is available on demand via
      // "View Meta Breakdown" (getOrganizationFinancialDetails) instead.
      const metaCost = Number((marketingSent * rates.marketingMetaCost + utilitySent * rates.utilityMetaCost).toFixed(2));

      // Client Billed: Use actual WalletLedger debit sum if available, else calculate at Prowexa Rates
      const calculatedCharges = Number((marketingSent * rates.marketingClientPrice + utilitySent * rates.utilityClientPrice).toFixed(2));
      const ledgerDebits = Number(ledgerDebitsSum._sum?.amount || 0);
      const clientBilled = Math.max(ledgerDebits, calculatedCharges);

      // Not floored at 0 — an org whose Meta messaging cost genuinely
      // exceeds what it's been billed (e.g. heavy marketing-template usage
      // priced too thin) is a real per-org loss the operator needs to see,
      // not one that should silently read as ₹0.00 profit.
      const markupProfit = Number((clientBilled - metaCost).toFixed(2));

      const dbBalance = Number(org.wallet?.availableBalance || 0);
      const unbilledCharges = clientBilled > ledgerDebits ? clientBilled - ledgerDebits : 0;
      const netBalance = dbBalance - unbilledCharges;

      return {
        ...org,
        wallet: org.wallet ? {
          ...org.wallet,
          availableBalance: netBalance,
        } : null,
        planActiveSince: latestPlanInvoice?.createdAt || null,
        financialTelemetry: {
          metaCost,
          markupProfit,
          clientBilled,
          marketingSent,
          utilitySent,
        },
      };
    })
  );

  return { organizations: orgsWithFinancials, total, page, limit };
}

export async function impersonateTenant(organizationId: string, actorAdminId?: string, reason?: string, ipAddress?: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId, deletedAt: null },
    include: {
      // Filtered to the actual owner — without this, an arbitrary member row
      // (e.g. a MANAGER or AGENT) could be picked as "the owner" while the
      // issued impersonation token always hardcoded role: 'BUSINESS_OWNER'
      // regardless of who was actually fetched.
      users: {
        where: { role: 'BUSINESS_OWNER' },
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
    throw new AppError('No active business owner found in target organization.', 400, 'NO_OWNER');
  }

  // Audit Log Entry
  await prisma.superAdminAuditLog.create({
    data: {
      actorAdminId: actorAdminId || null,
      targetOrganizationId: organizationId,
      action: 'IMPERSONATE_TENANT',
      resource: 'Organization',
      details: { reason: reason || 'Super Admin Support Troubleshooting' },
      ipAddress: ipAddress || '127.0.0.1',
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

async function assertOrganizationExists(organizationId: string): Promise<void> {
  // deletedAt: null matters here — without it, a soft-deleted org could be
  // un-suspended (toggleOrganizationSuspension), plan-tier-changed, or
  // AI-credited right back into a working state, since tenantContext only
  // checks isSuspended and never checks deletedAt.
  const org = await prisma.organization.findUnique({ where: { id: organizationId, deletedAt: null }, select: { id: true } });
  if (!org) {
    throw new AppError('Organization not found.', 404, 'ORGANIZATION_NOT_FOUND');
  }
}

export async function toggleOrganizationSuspension(
  organizationId: string,
  isSuspended: boolean,
  actorAdminId?: string,
  ipAddress?: string
) {
  await assertOrganizationExists(organizationId);

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { isSuspended },
  });

  await prisma.superAdminAuditLog.create({
    data: {
      actorAdminId,
      targetOrganizationId: organizationId,
      action: isSuspended ? 'SUSPEND_ORGANIZATION' : 'ACTIVATE_ORGANIZATION',
      resource: 'Organization',
      details: { isSuspended },
      ipAddress: ipAddress || '127.0.0.1',
    },
  });

  return updated;
}

// Soft delete only — Organization carries onDelete: Restrict relations
// (SuperAdminAuditLog, AuditLog, WalletLedger, Invoice) specifically so a
// hard delete can never silently take the financial/audit trail with it.
// Setting isSuspended alongside deletedAt reuses the exact same
// tenantContext enforcement path a manual suspension already goes through,
// so a deleted org's members are cut off from the API immediately, not just
// hidden from future SuperAdmin listings.
export async function deleteOrganization(organizationId: string, actorAdminId?: string, ipAddress?: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId, deletedAt: null },
    select: { id: true, name: true },
  });

  if (!org) {
    throw new AppError('Organization not found or already deleted.', 404, 'ORGANIZATION_NOT_FOUND');
  }

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { deletedAt: new Date(), isSuspended: true },
  });

  await prisma.superAdminAuditLog.create({
    data: {
      actorAdminId,
      targetOrganizationId: organizationId,
      action: 'DELETE_ORGANIZATION',
      resource: 'Organization',
      details: { name: org.name },
      ipAddress: ipAddress || '127.0.0.1',
    },
  });

  return updated;
}

export async function updateOrganizationPlanTier(
  organizationId: string,
  planTier: PlanTier,
  actorAdminId?: string,
  ipAddress?: string
) {
  await assertOrganizationExists(organizationId);

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: { planTier },
  });

  await prisma.superAdminAuditLog.create({
    data: {
      actorAdminId,
      targetOrganizationId: organizationId,
      action: 'UPDATE_PLAN_TIER',
      resource: 'Organization',
      details: { planTier },
      ipAddress: ipAddress || '127.0.0.1',
    },
  });

  return updated;
}

export async function grantAiCreditsToOrganization(
  organizationId: string,
  creditsAmount: number,
  actorAdminId?: string,
  ipAddress?: string
) {
  await assertOrganizationExists(organizationId);

  const updated = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      aiCreditsBalance: { increment: creditsAmount },
    },
  });

  await prisma.superAdminAuditLog.create({
    data: {
      actorAdminId,
      targetOrganizationId: organizationId,
      action: 'GRANT_AI_CREDITS',
      resource: 'Organization',
      details: { creditsAmount },
      ipAddress: ipAddress || '127.0.0.1',
    },
  });

  return updated;
}

export async function creditWalletForOrganization(
  organizationId: string,
  amountNumber: number,
  description?: string,
  actorAdminId?: string,
  ipAddress?: string
) {
  const { rechargeWallet } = await import('./billing-wallet.service.js');
  const referenceId = `SA_CREDIT_${Date.now()}`;
  const desc = description || 'SuperAdmin Manual Wallet Credit';

  const wallet = await rechargeWallet(organizationId, amountNumber, referenceId, desc);

  await prisma.superAdminAuditLog.create({
    data: {
      actorAdminId,
      targetOrganizationId: organizationId,
      action: 'MANUAL_WALLET_CREDIT',
      resource: 'Wallet',
      details: { amount: amountNumber, description: desc },
      ipAddress: ipAddress || '127.0.0.1',
    },
  });

  return wallet;
}

export async function updatePricingRule(
  data: {
    countryCode: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'SERVICE';
    metaCost: number;
    platformMarkup: number;
  },
  actorAdminId?: string,
  ipAddress?: string
) {
  if (!Object.values(ConversationCategory).includes(data.category as ConversationCategory)) {
    throw new AppError(`Invalid conversation category: ${data.category}`, 400, 'INVALID_CATEGORY');
  }
  const category = data.category as ConversationCategory;
  const totalPrice = Number((data.metaCost + data.platformMarkup).toFixed(4));

  const rule = await prisma.pricingRule.upsert({
    where: {
      countryCode_conversationCategory: {
        countryCode: data.countryCode,
        conversationCategory: category,
      },
    },
    update: {
      metaCost: data.metaCost,
      platformMarkup: data.platformMarkup,
      totalPrice,
    },
    create: {
      countryCode: data.countryCode,
      conversationCategory: category,
      metaCost: data.metaCost,
      platformMarkup: data.platformMarkup,
      totalPrice,
      currency: 'INR',
    },
  });

  await prisma.superAdminAuditLog.create({
    data: {
      actorAdminId,
      action: 'UPDATE_PRICING_RULE',
      resource: 'PricingRule',
      details: { countryCode: data.countryCode, category, metaCost: data.metaCost, platformMarkup: data.platformMarkup, totalPrice },
      ipAddress: ipAddress || '127.0.0.1',
    },
  });

  return rule;
}

/**
 * Handles both a superadmin reply and a plain status change (e.g. "Mark
 * Resolved" with no message) — message is optional so resolving/closing a
 * ticket doesn't force typing something into it first.
 */
export async function superAdminReplyTicket(
  ticketId: string,
  message?: string | null,
  status?: string,
  actorAdminId?: string,
  ipAddress?: string
) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
  });

  if (!ticket) {
    throw new AppError('Support ticket not found', 404, 'NOT_FOUND');
  }

  if (status && !Object.values(SupportTicketStatus).includes(status as SupportTicketStatus)) {
    throw new AppError(
      `Invalid ticket status "${status}". Must be one of: ${Object.values(SupportTicketStatus).join(', ')}.`,
      400,
      'INVALID_STATUS'
    );
  }

  const trimmedMessage = message?.trim();
  if (!trimmedMessage && !status) {
    throw new AppError('Provide a reply message or a status update.', 400, 'EMPTY_UPDATE');
  }

  if (trimmedMessage) {
    await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderType: 'SUPER_ADMIN',
        senderId: actorAdminId || 'SYSTEM_SUPER_ADMIN',
        message: trimmedMessage,
      },
    });
  }

  const updatedTicket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: (status as SupportTicketStatus) || (trimmedMessage ? 'IN_PROGRESS' : ticket.status),
      updatedAt: new Date(),
    },
    include: { messages: { orderBy: { createdAt: 'asc' } }, organization: true },
  });

  await prisma.superAdminAuditLog.create({
    data: {
      actorAdminId,
      targetOrganizationId: ticket.organizationId,
      action: trimmedMessage ? 'REPLY_SUPPORT_TICKET' : 'UPDATE_TICKET_STATUS',
      resource: 'SupportTicket',
      details: { ticketId, status: status || null, replied: Boolean(trimmedMessage) },
      ipAddress: ipAddress || '127.0.0.1',
    },
  });

  return updatedTicket;
}

export async function getOrganizationFinancialDetails(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId, deletedAt: null },
    include: {
      wallet: true,
      whatsappAccounts: {
        where: { deletedAt: null },
        select: { id: true, wabaId: true, displayPhoneNumber: true, status: true },
      },
    },
  });

  if (!org) {
    throw new AppError('Organization not found', 404, 'NOT_FOUND');
  }

  const [inboundCount, ledgers, invoices] = await Promise.all([
    prisma.message.count({
      where: { organizationId: org.id, direction: 'INBOUND' },
    }),
    prisma.walletLedger.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.invoice.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const { marketingSent, utilitySent } = await getTemplateSentCounts(prisma, { organizationId: org.id });
  const rates = await getPricingRates(prisma);
  const marketingMetaCost = Number((marketingSent * rates.marketingMetaCost).toFixed(2));
  const utilityMetaCost = Number((utilitySent * rates.utilityMetaCost).toFixed(2));
  const totalMetaCost = Number((marketingMetaCost + utilityMetaCost).toFixed(2));

  const marketingClientBilled = Number((marketingSent * rates.marketingClientPrice).toFixed(2));
  const utilityClientBilled = Number((utilitySent * rates.utilityClientPrice).toFixed(2));
  const totalClientBilled = Number((marketingClientBilled + utilityClientBilled).toFixed(2));

  const netProfit = Number((totalClientBilled - totalMetaCost).toFixed(2));

  return {
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      planTier: org.planTier,
      billingMode: org.billingMode,
      createdAt: org.createdAt,
      whatsappAccount: org.whatsappAccounts?.[0] || null,
    },
    wallet: org.wallet,
    metaBreakdown: {
      marketing: {
        count: marketingSent,
        metaRate: rates.marketingMetaCost,
        metaCost: marketingMetaCost,
        clientRate: rates.marketingClientPrice,
        clientBilled: marketingClientBilled,
        profit: Number((marketingClientBilled - marketingMetaCost).toFixed(2)),
      },
      utility: {
        count: utilitySent,
        metaRate: rates.utilityMetaCost,
        metaCost: utilityMetaCost,
        clientRate: rates.utilityClientPrice,
        clientBilled: utilityClientBilled,
        profit: Number((utilityClientBilled - utilityMetaCost).toFixed(2)),
      },
      service: {
        count: inboundCount,
        metaRate: 0.00,
        metaCost: 0.00,
        clientRate: 0.00,
        clientBilled: 0.00,
        profit: 0.00,
      },
      totals: {
        totalMetaCost,
        totalClientBilled,
        netProfit,
        paidMessagesCount: marketingSent + utilitySent,
        freeServiceCount: inboundCount,
      },
    },
    ledgers,
    invoices,
  };
}

let masterGlobalAiKeyMemory = process.env.GEMINI_API_KEY || '';

export async function saveMasterAiKey(apiKey: string, actorAdminId?: string, ipAddress?: string) {
  const trimmedKey = (apiKey || '').trim();
  masterGlobalAiKeyMemory = trimmedKey;
  process.env.GEMINI_API_KEY = trimmedKey;

  // Every organization shares this one platform-wide key — deliberately
  // unconditional (no `where`) so a new master key always takes effect
  // everywhere immediately, matching the product decision that there is no
  // per-org custom Gemini key.
  await prisma.organization.updateMany({
    data: {
      geminiApiKey: trimmedKey ? encryptToken(trimmedKey) : null,
    },
  });

  await prisma.superAdminAuditLog.create({
    data: {
      actorAdminId,
      action: 'UPDATE_GLOBAL_AI_KEY',
      resource: 'SystemSettings',
      details: { keyLength: trimmedKey.length },
      ipAddress: ipAddress || '127.0.0.1',
    },
  });

  logger.info({ keyLength: trimmedKey.length }, 'Master Global Gemini API Key updated by SuperAdmin.');

  return {
    message: 'Master Global AI API Key saved and activated across all platform tenant organizations.',
    key: trimmedKey,
  };
}

export async function getMasterAiKey() {
  const currentKey = process.env.GEMINI_API_KEY || masterGlobalAiKeyMemory || '';
  return { apiKey: currentKey };
}

export async function getSystemSettings() {
  let settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    settings = await prisma.systemSettings.create({ data: {} });
  }
  return settings;
}

export async function updateSystemSettings(data: any) {
  let settings = await prisma.systemSettings.findFirst();
  if (!settings) {
    settings = await prisma.systemSettings.create({ data });
  } else {
    settings = await prisma.systemSettings.update({
      where: { id: settings.id },
      data,
    });
  }
  return settings;
}

