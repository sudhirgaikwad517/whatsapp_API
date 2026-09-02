import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';
import { AppError } from '../middlewares/error-handler.middleware.js';
import { logger } from '../utils/logger.js';
import { UserRole } from '@prowexa/shared-types';
import type { RegisterInput, LoginInput } from '../validators/auth.schema.js';
import { sendMail, buildVerificationEmail, buildPasswordResetEmail } from '../utils/mailer.js';

const BCRYPT_ROUNDS = 12;

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function generateUniqueSlug(base: string): Promise<string> {
  const slug = slugify(base);
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
        isEmailVerified: false,
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

  try {
    const verifyUrl = `${env.API_BASE_URL.replace(/\/$/, '')}/api/v1/auth/verify-email?token=${emailVerifyToken}`;
    await sendMail({
      to: result.user.email,
      subject: 'Verify your Prowexa account',
      html: buildVerificationEmail(result.user.fullName, verifyUrl),
    });
  } catch (err) {
    // Registration should still succeed even if the verification email fails
    // to send — resendVerificationEmail() below lets them request it again.
    logger.error({ userId: result.user.id, err }, 'Failed to send verification email after registration.');
  }

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
    decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET, { algorithms: ['HS256'] }) as { userId: string };
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

/**
 * Verifies that a pair of tokens handed off via the SSO redirect (from
 * wabtic-website) were genuinely issued by this server, and returns the user
 * they belong to. Used only to move the tokens into httpOnly cookies — never
 * to mint new credentials.
 */
export async function verifySsoTokens(accessToken: string, refreshToken?: string) {
  let decoded: { userId: string; organizationId: string };
  try {
    decoded = jwt.verify(accessToken, env.JWT_SECRET, { algorithms: ['HS256'] }) as typeof decoded;
  } catch {
    throw new AppError('Invalid or expired SSO access token.', 401, 'INVALID_TOKEN');
  }

  if (refreshToken) {
    try {
      jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET, { algorithms: ['HS256'] });
    } catch {
      throw new AppError('Invalid or expired SSO refresh token.', 401, 'INVALID_TOKEN');
    }
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId, deletedAt: null } });
  if (!user) {
    throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id, organizationId: decoded.organizationId },
  });
  if (!membership) {
    throw new AppError('User is not a member of this organization.', 403, 'NO_ORGANIZATION');
  }

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: membership.role,
      organizationId: membership.organizationId,
    },
  };
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

export async function resendVerificationEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond generically to prevent email enumeration
  const generic = { message: 'If this email is registered and unverified, a new verification link has been sent.' };
  if (!user || user.isEmailVerified) {
    return generic;
  }

  const emailVerifyToken = crypto.randomBytes(32).toString('hex');
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifyToken } });

  const verifyUrl = `${env.API_BASE_URL.replace(/\/$/, '')}/api/v1/auth/verify-email?token=${emailVerifyToken}`;
  await sendMail({
    to: user.email,
    subject: 'Verify your Prowexa account',
    html: buildVerificationEmail(user.fullName, verifyUrl),
  });

  return generic;
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond generically to prevent email enumeration
  const generic = { message: 'If this email is registered, a reset link has been sent.' };
  if (!user) {
    return generic;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetTokenExpiry },
  });

  const resetUrl = `${env.FRONTEND_URL.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
  try {
    await sendMail({
      to: user.email,
      subject: 'Reset your Prowexa password',
      html: buildPasswordResetEmail(resetUrl),
    });
  } catch (err) {
    logger.error({ userId: user.id, err }, 'Failed to send password reset email.');
  }

  return generic;
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
  });
  if (!user) {
    throw new AppError('Invalid or expired reset token.', 400, 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, resetToken: null, resetTokenExpiry: null },
    }),
    // Revoke every existing refresh token — a password reset should end all
    // other sessions, not leave a stolen-credential session still valid.
    prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  logger.info({ userId: user.id }, 'Password reset completed; all sessions revoked.');

  return { message: 'Password has been reset successfully. Please log in with your new password.' };
}

export async function updateProfile(userId: string, data: { fullName?: string; phoneNumber?: string }) {
  const updateData: Record<string, any> = {};
  if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
  if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber?.trim() || null;

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, email: true, fullName: true, phoneNumber: true, isEmailVerified: true },
  });

  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError('Current password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    // Same as a forgot-password reset — revoke every session so a stolen
    // credential can't keep using an old refresh token after the change.
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  logger.info({ userId }, 'User changed their own password.');

  return { message: 'Password updated successfully.' };
}

export async function changeEmail(userId: string, currentPassword: string, newEmail: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError('Current password is incorrect.', 400, 'INVALID_CURRENT_PASSWORD');
  }

  const normalizedEmail = newEmail.trim().toLowerCase();
  if (normalizedEmail === user.email.toLowerCase()) {
    throw new AppError('This is already your current email address.', 400, 'EMAIL_UNCHANGED');
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new AppError('An account with this email already exists.', 409, 'EMAIL_IN_USE');
  }

  const emailVerifyToken = crypto.randomBytes(32).toString('hex');
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: normalizedEmail, isEmailVerified: false, emailVerifyToken },
    select: { id: true, email: true, fullName: true, isEmailVerified: true },
  });

  const verifyUrl = `${env.API_BASE_URL.replace(/\/$/, '')}/api/v1/auth/verify-email?token=${emailVerifyToken}`;
  try {
    await sendMail({
      to: updated.email,
      subject: 'Verify your new email address',
      html: buildVerificationEmail(updated.fullName, verifyUrl),
    });
  } catch (err) {
    logger.error({ userId, err }, 'Failed to send new-email verification mail.');
  }

  logger.info({ userId, newEmail: updated.email }, 'User changed their account email; re-verification required.');

  return updated;
}
