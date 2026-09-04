import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { encryptToken, safeDecryptToken as safeDecrypt } from '../utils/encryption.js';
import bcrypt from 'bcryptjs';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

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

  return prisma.organizationMember.findUnique({
    where: { id: updatedMember.id },
    include: {
      user: { select: { id: true, fullName: true, email: true, phoneNumber: true, isEmailVerified: true, createdAt: true } },
    },
  });
}

export async function inviteMember(
  organizationId: string,
  input: { email: string; fullName: string; role: 'MANAGER' | 'AGENT'; password?: string }
) {
  const email = input.email.trim().toLowerCase();

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
        isEmailVerified: true,
      },
    });
  } else if (input.password && input.password.trim().length >= 6) {
    const passwordHash = await bcrypt.hash(input.password.trim(), 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
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
    },
    include: {
      user: {
        select: { id: true, fullName: true, email: true, isEmailVerified: true, createdAt: true },
      },
    },
  });

  // Only surfaced when the caller didn't supply their own password, so the
  // admin has something to hand the new member — never echoes back a
  // caller-supplied password.
  const generatedPassword = input.password && input.password.trim().length >= 6 ? undefined : rawPassword;

  return { ...member, generatedPassword };
}
