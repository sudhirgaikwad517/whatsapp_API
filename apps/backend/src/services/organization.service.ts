import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { encryptToken, safeDecryptToken as safeDecrypt } from '../utils/encryption.js';
import bcrypt from 'bcryptjs';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export async function getOrganization(organizationId: string) {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        timezone: true,
        aiKnowledgeBase: true,
        geminiApiKey: true,
        isAiAutoRespondEnabled: true,
        isSuspended: true,
        planTier: true,
        createdAt: true,
        billingAddress: true,
        billingGstin: true,
        billingPan: true,
        billingEmail: true,
        billingPhone: true,
        escalationTemplateId: true,
        slaReassignMinutes: true,
      },
    });

    if (!org) throw new AppError('Organization not found.', 404, 'ORGANIZATION_NOT_FOUND');
    return { ...org, geminiApiKey: safeDecrypt(org.geminiApiKey) };
  } catch (err: any) {
    const orgFallback = await prisma.organization.findUnique({
      where: { id: organizationId, deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        timezone: true,
        aiKnowledgeBase: true,
        geminiApiKey: true,
        isSuspended: true,
        planTier: true,
        createdAt: true,
      },
    });

    if (!orgFallback) throw new AppError('Organization not found.', 404, 'ORGANIZATION_NOT_FOUND');
    return { ...orgFallback, geminiApiKey: safeDecrypt(orgFallback.geminiApiKey), isAiAutoRespondEnabled: false };
  }
}

export async function updateOrganization(
  organizationId: string,
  data: {
    name?: string;
    timezone?: string;
    logoUrl?: string;
    aiKnowledgeBase?: string;
    geminiApiKey?: string;
    isAiAutoRespondEnabled?: boolean;
    razorpayKeyId?: string;
    razorpayKeySecret?: string;
    billingAddress?: string;
    billingGstin?: string;
    billingPan?: string;
    billingEmail?: string;
    billingPhone?: string;
    escalationTemplateId?: string | null;
    slaReassignMinutes?: number | null;
  }
) {
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.timezone !== undefined) updateData.timezone = data.timezone;
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
  if (data.aiKnowledgeBase !== undefined) updateData.aiKnowledgeBase = data.aiKnowledgeBase;
  if (data.geminiApiKey !== undefined) updateData.geminiApiKey = data.geminiApiKey ? encryptToken(data.geminiApiKey) : null;
  if (data.isAiAutoRespondEnabled !== undefined) updateData.isAiAutoRespondEnabled = Boolean(data.isAiAutoRespondEnabled);
  if (data.razorpayKeyId !== undefined) updateData.razorpayKeyId = data.razorpayKeyId;
  if (data.razorpayKeySecret !== undefined) updateData.razorpayKeySecret = data.razorpayKeySecret ? encryptToken(data.razorpayKeySecret) : null;
  if (data.billingAddress !== undefined) updateData.billingAddress = data.billingAddress;
  if (data.billingGstin !== undefined) updateData.billingGstin = data.billingGstin;
  if (data.billingPan !== undefined) updateData.billingPan = data.billingPan;
  if (data.billingEmail !== undefined) updateData.billingEmail = data.billingEmail;
  if (data.billingPhone !== undefined) updateData.billingPhone = data.billingPhone;
  if (data.escalationTemplateId !== undefined) updateData.escalationTemplateId = data.escalationTemplateId || null;
  if (data.slaReassignMinutes !== undefined) {
    updateData.slaReassignMinutes =
      data.slaReassignMinutes === null || data.slaReassignMinutes === 0 ? null : Math.max(1, Math.round(data.slaReassignMinutes));
  }

  try {
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        timezone: true,
        aiKnowledgeBase: true,
        geminiApiKey: true,
        isAiAutoRespondEnabled: true,
        razorpayKeyId: true,
        billingAddress: true,
        billingGstin: true,
        billingPan: true,
        billingEmail: true,
        billingPhone: true,
        escalationTemplateId: true,
        slaReassignMinutes: true,
      },
    });
    return { ...updated, geminiApiKey: safeDecrypt(updated.geminiApiKey) };
  } catch (err: any) {
    // Gracefully fallback if isAiAutoRespondEnabled column does not exist yet in production DB schema
    if (updateData.isAiAutoRespondEnabled !== undefined) {
      delete updateData.isAiAutoRespondEnabled;
      const updatedFallback = await prisma.organization.update({
        where: { id: organizationId },
        data: updateData,
        select: { id: true, name: true, slug: true, logoUrl: true, timezone: true, aiKnowledgeBase: true, geminiApiKey: true, razorpayKeyId: true },
      });
      return { ...updatedFallback, geminiApiKey: safeDecrypt(updatedFallback.geminiApiKey) };
    }
    throw err;
  }
}

export async function getMembers(organizationId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          isEmailVerified: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function removeMember(organizationId: string, targetUserId: string, requestingUserId: string) {
  if (targetUserId === requestingUserId) {
    throw new AppError('You cannot remove yourself from the organization.', 400, 'CANNOT_REMOVE_SELF');
  }

  const member = await prisma.organizationMember.findFirst({
    where: { organizationId, userId: targetUserId },
  });

  if (!member) {
    throw new AppError('Member not found in this organization.', 404, 'MEMBER_NOT_FOUND');
  }

  await prisma.organizationMember.delete({ where: { id: member.id } });
  return { message: 'Member removed successfully.' };
}

export async function updateMember(
  organizationId: string,
  targetUserId: string,
  requestingUserId: string,
  data: { isActive?: boolean; allowedPages?: string[]; role?: 'MANAGER' | 'AGENT'; fullName?: string; phoneNumber?: string }
) {
  if (targetUserId === requestingUserId && data.isActive === false) {
    throw new AppError('You cannot deactivate your own access.', 400, 'CANNOT_DEACTIVATE_SELF');
  }

  const member = await prisma.organizationMember.findFirst({
    where: { organizationId, userId: targetUserId },
    include: { user: { select: { fullName: true, email: true } } },
  });
  if (!member) {
    throw new AppError('Member not found in this organization.', 404, 'MEMBER_NOT_FOUND');
  }

  const memberUpdate: Record<string, any> = {};
  if (data.isActive !== undefined) memberUpdate.isActive = data.isActive;
  if (data.allowedPages !== undefined) memberUpdate.allowedPages = data.allowedPages;
  if (data.role !== undefined) memberUpdate.role = data.role;

  const userUpdate: Record<string, any> = {};
  if (data.fullName !== undefined) userUpdate.fullName = data.fullName.trim();
  if (data.phoneNumber !== undefined) userUpdate.phoneNumber = data.phoneNumber?.trim() || null;

  const [updatedMember] = await prisma.$transaction([
    prisma.organizationMember.update({
      where: { id: member.id },
      data: memberUpdate,
    }),
    ...(Object.keys(userUpdate).length > 0
      ? [prisma.user.update({ where: { id: targetUserId }, data: userUpdate })]
      : []),
  ]);

  const result = await prisma.organizationMember.findUnique({
    where: { id: updatedMember.id },
    include: {
      user: { select: { id: true, fullName: true, email: true, phoneNumber: true, isEmailVerified: true, createdAt: true } },
    },
  });

  // Notify the member by email about changes that affect what they can do —
  // an activation/deactivation toggle and a role/access change are reported
  // as separate notifications since they're conceptually distinct events
  // (both can fire from the same request if an admin changed several things
  // at once).
  void notifyMemberOfAccountChange(organizationId, member, data).catch(() => {});

  return result;
}

async function notifyMemberOfAccountChange(
  organizationId: string,
  member: { user: { fullName: string; email: string }; isActive: boolean; allowedPages: string[]; role: string },
  data: { isActive?: boolean; allowedPages?: string[]; role?: 'MANAGER' | 'AGENT' }
): Promise<void> {
  const roleOrAccessChanged =
    (data.role !== undefined && data.role !== member.role) ||
    (data.allowedPages !== undefined && JSON.stringify(data.allowedPages) !== JSON.stringify(member.allowedPages));
  const activeStatusChanged = data.isActive !== undefined && data.isActive !== member.isActive;

  if (!roleOrAccessChanged && !activeStatusChanged) return;

  try {
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const orgName = org?.name || 'your organization';
    const loginUrl = `${env.ADMIN_PANEL_URL.replace(/\/$/, '')}/login`;
    const { sendMail, buildAccessUpdatedEmail, buildAccountStatusEmail } = await import('../utils/mailer.js');

    if (activeStatusChanged) {
      await sendMail({
        to: member.user.email,
        subject: data.isActive ? 'Your Prowexa Account Has Been Reactivated' : 'Your Prowexa Account Has Been Deactivated',
        html: buildAccountStatusEmail({ fullName: member.user.fullName, isActive: data.isActive!, orgName, loginUrl }),
      });
    }
    if (roleOrAccessChanged) {
      await sendMail({
        to: member.user.email,
        subject: 'Your Prowexa Account Access Was Updated',
        html: buildAccessUpdatedEmail({
          fullName: member.user.fullName,
          role: data.role ?? member.role,
          allowedPages: data.allowedPages ?? member.allowedPages,
          orgName,
          loginUrl,
        }),
      });
    }
  } catch (err) {
    logger.error({ organizationId, err }, 'Failed to send member account-change notification email.');
  }
}

export async function inviteMember(
  organizationId: string,
  input: {
    email: string;
    fullName: string;
    role: 'MANAGER' | 'AGENT';
    password?: string;
    phoneNumber?: string;
    allowedPages?: string[];
  }
) {
  const email = input.email.trim().toLowerCase();
  const isNewUser = !(await prisma.user.findUnique({ where: { email } }));
  let user = await prisma.user.findUnique({ where: { email } });

  // A fixed fallback password here would be a standing, publicly-known
  // backdoor for every invited member who doesn't get an explicit password —
  // generate a random one instead so it's unique per invite.
  const rawPassword =
    input.password && input.password.trim().length >= 6 ? input.password.trim() : crypto.randomBytes(9).toString('base64url');

  if (!user) {
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    user = await prisma.user.create({
      data: {
        email,
        fullName: input.fullName.trim(),
        passwordHash,
        phoneNumber: input.phoneNumber?.trim() || null,
        isEmailVerified: true,
      },
    });
  } else if (input.password && input.password.trim().length >= 6) {
    const passwordHash = await bcrypt.hash(input.password.trim(), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, ...(input.phoneNumber?.trim() ? { phoneNumber: input.phoneNumber.trim() } : {}) },
    });
  } else if (input.phoneNumber?.trim()) {
    await prisma.user.update({ where: { id: user.id }, data: { phoneNumber: input.phoneNumber.trim() } });
  }

  const existingMember = await prisma.organizationMember.findFirst({
    where: { organizationId, userId: user.id },
  });

  if (existingMember) {
    throw new AppError('User is already a team member in this organization.', 409, 'ALREADY_MEMBER');
  }

  const member = await prisma.organizationMember.create({
    data: {
      organizationId,
      userId: user.id,
      role: input.role,
      allowedPages: input.allowedPages && input.allowedPages.length > 0 ? input.allowedPages : [],
    },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, phoneNumber: true, isEmailVerified: true, createdAt: true },
      },
    },
  });

  // Only surfaced (and only ever emailed) when the caller didn't supply their
  // own password and this is a genuinely new account — never echoes back a
  // caller-supplied password, and never emails a fabricated password for an
  // existing account whose real password wasn't touched.
  const generatedPassword = isNewUser && !(input.password && input.password.trim().length >= 6) ? rawPassword : undefined;

  try {
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true } });
    const { sendMail, buildWelcomeAgentEmail } = await import('../utils/mailer.js');
    await sendMail({
      to: member.user.email,
      subject: `You've Been Added to ${org?.name || 'a Prowexa Workspace'}`,
      html: buildWelcomeAgentEmail({
        fullName: member.user.fullName,
        email: member.user.email,
        tempPassword: generatedPassword || null,
        role: input.role,
        allowedPages: member.allowedPages,
        orgName: org?.name || 'Prowexa',
        loginUrl: `${env.ADMIN_PANEL_URL.replace(/\/$/, '')}/login`,
      }),
    });
  } catch (err) {
    logger.error({ organizationId, err }, 'Failed to send new team member welcome email.');
  }

  return { ...member, generatedPassword };
}
