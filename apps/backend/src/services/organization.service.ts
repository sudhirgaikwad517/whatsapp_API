import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import bcrypt from 'bcryptjs';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export async function getOrganization(organizationId: string) {
  try {
    const org = await (prisma as any).organization.findUnique({
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
        createdAt: true,
      },
    });

    if (!org) throw new AppError('Organization not found.', 404, 'ORGANIZATION_NOT_FOUND');
    return org;
  } catch (err: any) {
    const orgFallback = await (prisma as any).organization.findUnique({
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
        createdAt: true,
      },
    });

    if (!orgFallback) throw new AppError('Organization not found.', 404, 'ORGANIZATION_NOT_FOUND');
    return { ...orgFallback, isAiAutoRespondEnabled: false };
  }
}

export async function updateOrganization(
  organizationId: string,
  data: { name?: string; timezone?: string; logoUrl?: string; aiKnowledgeBase?: string; geminiApiKey?: string; isAiAutoRespondEnabled?: boolean; razorpayKeyId?: string; razorpayKeySecret?: string }
) {
  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.timezone !== undefined) updateData.timezone = data.timezone;
  if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
  if (data.aiKnowledgeBase !== undefined) updateData.aiKnowledgeBase = data.aiKnowledgeBase;
  if (data.geminiApiKey !== undefined) updateData.geminiApiKey = data.geminiApiKey;
  if (data.isAiAutoRespondEnabled !== undefined) updateData.isAiAutoRespondEnabled = Boolean(data.isAiAutoRespondEnabled);
  if (data.razorpayKeyId !== undefined) updateData.razorpayKeyId = data.razorpayKeyId;
  if (data.razorpayKeySecret !== undefined) updateData.razorpayKeySecret = data.razorpayKeySecret;

  try {
    const updated = await (prisma as any).organization.update({
      where: { id: organizationId },
      data: updateData,
      select: { id: true, name: true, slug: true, logoUrl: true, timezone: true, aiKnowledgeBase: true, geminiApiKey: true, isAiAutoRespondEnabled: true, razorpayKeyId: true },
    });
    return updated;
  } catch (err: any) {
    // Gracefully fallback if isAiAutoRespondEnabled column does not exist yet in production DB schema
    if (updateData.isAiAutoRespondEnabled !== undefined) {
      delete updateData.isAiAutoRespondEnabled;
      const updatedFallback = await (prisma as any).organization.update({
        where: { id: organizationId },
        data: updateData,
        select: { id: true, name: true, slug: true, logoUrl: true, timezone: true, aiKnowledgeBase: true, geminiApiKey: true, razorpayKeyId: true },
      });
      return updatedFallback;
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

export async function inviteMember(
  organizationId: string,
  input: { email: string; fullName: string; role: 'MANAGER' | 'AGENT'; password?: string }
) {
  const email = input.email.trim().toLowerCase();

  let user = await prisma.user.findUnique({ where: { email } });

  const rawPassword = input.password && input.password.trim().length >= 6 ? input.password.trim() : 'Prowexa123!';

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

  return member;
}
