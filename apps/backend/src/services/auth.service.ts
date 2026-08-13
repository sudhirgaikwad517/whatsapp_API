import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { logger } from '../utils/logger.js';
import { UserRole } from '@prowexa/shared-types';
import type { RegisterInput, LoginInput } from '../validators/auth.schema.js';

const BCRYPT_ROUNDS = 12;

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function generateUniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;
  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const exists = await prisma.organization.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
    suffix++;
  }
}

function generateAccessToken(payload: object): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

function generateRefreshToken(payload: object): string {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  } as jwt.SignOptions);
}

// ─── Auth Service ────────────────────────────────────────────────────────────

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    throw new AppError('A user with this email already exists.', 409, 'EMAIL_ALREADY_REGISTERED');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const emailVerifyToken = crypto.randomBytes(32).toString('hex');
  const slug = await generateUniqueSlug(input.organizationName);

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.organizationName, slug },
    });

    // Auto-provision tenant wallet
    await tx.wallet.create({
      data: {
        organizationId: organization.id,
        availableBalance: 0,
        reservedBalance: 0,
        currency: 'INR',
      },
    });

    const user = await tx.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash,
        emailVerifyToken,
        isEmailVerified: true,
      },
    });

    await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: UserRole.BUSINESS_OWNER,
      },
    });

    return { organization, user };
  });

  logger.info({ userId: result.user.id, orgId: result.organization.id }, 'New user & organization registered');

  const tokenPayload = {
    userId: result.user.id,
    organizationId: result.organization.id,
    role: UserRole.BUSINESS_OWNER,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      fullName: result.user.fullName,
      organizationId: result.organization.id,
      role: UserRole.BUSINESS_OWNER,
    },
    organization: result.organization,
    tokens: {
      accessToken,
      refreshToken,
    },
  };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email, deletedAt: null },
    include: {
      memberships: {
        take: 1,
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!user) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email before logging in.', 403, 'EMAIL_NOT_VERIFIED');
  }

  const membership = user.memberships[0];
  if (!membership) {
    throw new AppError('User has no associated organization.', 403, 'NO_ORGANIZATION');
  }

  const tokenPayload = {
    userId: user.id,
    email: user.email,
    organizationId: membership.organizationId,
    role: membership.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken({ userId: user.id });
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  logger.info({ userId: user.id }, 'User logged in');

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: membership.role,
      organizationId: membership.organizationId,
    },
  };
}

export async function refreshAccessToken(refreshToken: string) {
  let decoded: { userId: string };
  try {
    decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as { userId: string };
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401, 'INVALID_REFRESH_TOKEN');
  }

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError('Refresh token has been revoked or expired.', 401, 'INVALID_REFRESH_TOKEN');
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: decoded.userId },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!membership) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  const tokenPayload = {
    userId: membership.userId,
    email: membership.user.email,
    organizationId: membership.organizationId,
    role: membership.role,
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  return { accessToken: newAccessToken };
}

export async function logoutUser(refreshToken: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({ where: { emailVerifyToken: token } });
  if (!user) {
    throw new AppError('Invalid or expired email verification token.', 400, 'INVALID_VERIFY_TOKEN');
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, emailVerifyToken: null },
  });
  return { message: 'Email verified successfully. You may now log in.' };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond generically to prevent email enumeration
  if (!user) {
    return { message: 'If this email is registered, a reset link has been sent.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry },
  });

  // TODO: Send reset email via email provider
  logger.info({ userId: user.id }, 'Password reset requested (token generated)');

  return { message: 'If this email is registered, a reset link has been sent.' };
}
