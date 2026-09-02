import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email via the configured SMTP transport. If no SMTP host is
 * configured (e.g. local development), logs the content instead of throwing —
 * registration/password-reset flows should never hard-fail because email
 * delivery isn't set up yet.
 */
export async function sendMail({ to, subject, html }: SendMailInput): Promise<void> {
  const t = getTransporter();
  if (!t) {
    logger.warn({ to, subject }, 'SMTP not configured — email not sent (dev fallback: logging instead).');
    logger.info({ to, subject, html }, 'Email content (not delivered)');
    return;
  }

  try {
    await t.sendMail({ from: env.SMTP_FROM, to, subject, html });
  } catch (err: any) {
    logger.error({ to, subject, err: err.message }, 'Failed to send email.');
    throw err;
  }
}

export function buildVerificationEmail(fullName: string, verifyUrl: string): SendMailInput['html'] {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Welcome to Prowexa, ${fullName}!</h2>
      <p>Please verify your email address to activate your account.</p>
      <p><a href="${verifyUrl}" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Verify Email</a></p>
      <p>If the button doesn't work, copy this link into your browser:<br>${verifyUrl}</p>
      <p>If you didn't create this account, you can safely ignore this email.</p>
    </div>
  `;
}

export function buildPasswordResetEmail(resetUrl: string): SendMailInput['html'] {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your Prowexa password</h2>
      <p>We received a request to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Reset Password</a></p>
      <p>If the button doesn't work, copy this link into your browser:<br>${resetUrl}</p>
      <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
    </div>
  `;
}
