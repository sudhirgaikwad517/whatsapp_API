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

const EMAIL_FOOTER = `
  <p style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
    <a href="https://www.prowexa.com" style="color:#059669;text-decoration:none;">Prowexa Technologies Pvt. Ltd.</a>
    &nbsp;•&nbsp;
    <a href="mailto:support@prowexa.com" style="color:#059669;text-decoration:none;">support@prowexa.com</a>
  </p>
`;

export function buildVerificationEmail(fullName: string, verifyUrl: string, loginUrl?: string): SendMailInput['html'] {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Welcome to <a href="https://www.prowexa.com" style="color:#059669;text-decoration:none;">Prowexa</a>, ${fullName}!</h2>
      <p>Please verify your email address to activate your account.</p>
      <p><a href="${verifyUrl}" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Verify Email</a></p>
      <p>If the button doesn't work, copy this link into your browser:<br>${verifyUrl}</p>
      ${
        loginUrl
          ? `<p>Once verified, you can log in here: <a href="${loginUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;margin-top:4px;">Login to Prowexa</a></p>`
          : ''
      }
      <p>If you didn't create this account, you can safely ignore this email.</p>
      ${EMAIL_FOOTER}
    </div>
  `;
}

export function buildPasswordResetEmail(resetUrl: string): SendMailInput['html'] {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Reset your <a href="https://www.prowexa.com" style="color:#059669;text-decoration:none;">Prowexa</a> password</h2>
      <p>We received a request to reset your password. This link expires in 1 hour.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Reset Password</a></p>
      <p>If the button doesn't work, copy this link into your browser:<br>${resetUrl}</p>
      <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
      ${EMAIL_FOOTER}
    </div>
  `;
}

export function buildChatAssignedEmail(agentName: string, contactName: string, orgName: string, loginUrl: string): SendMailInput['html'] {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>New Chat Assigned to You</h2>
      <p>Hi ${agentName},</p>
      <p>Our AI Copilot handed off a conversation with <strong>${contactName}</strong> to you at <strong>${orgName}</strong> — it needs a human touch. Please open your Live Inbox and resolve the customer's query.</p>
      <p><a href="${loginUrl}" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Login to Dashboard</a></p>
      <p>We also sent you a WhatsApp message about this, if your organization has that enabled.</p>
      ${EMAIL_FOOTER}
    </div>
  `;
}

export function buildPurchaseConfirmationEmail(input: {
  fullName: string;
  description: string;
  amount: number;
  invoiceNumber: string;
}): SendMailInput['html'] {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Payment Received — Thank you, ${input.fullName}!</h2>
      <p>We've successfully processed your payment on <a href="https://www.prowexa.com" style="color:#059669;text-decoration:none;">Prowexa</a>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Description</td>
          <td style="padding:8px 0;text-align:right;font-weight:bold;">${input.description}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Amount Paid</td>
          <td style="padding:8px 0;text-align:right;font-weight:bold;">₹${input.amount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Invoice Number</td>
          <td style="padding:8px 0;text-align:right;font-weight:bold;">${input.invoiceNumber}</td>
        </tr>
      </table>
      <p><a href="${env.ADMIN_PANEL_URL.replace(/\/$/, '')}/billing" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">View & Download Invoice</a></p>
      ${EMAIL_FOOTER}
    </div>
  `;
}

// Kept in sync with apps/backend/src/middlewares/page-access.middleware.ts
// PAGE_KEYS and apps/frontend/src/pages/Team.tsx PAGE_OPTIONS.
const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  inbox: 'Live Inbox',
  campaigns: 'Campaigns',
  contacts: 'Contacts CRM',
  templates: 'Meta Templates',
  'auto-reply': 'Auto Reply Bot',
  flows: 'Chatbot Flows',
  catalog: 'Product Catalog',
  billing: 'Billing & Credits',
  team: 'Team & Agents',
  analytics: 'Analytics',
  settings: 'Organization Settings',
  profile: 'Profile & Support Portal',
};

function describeAccess(allowedPages: string[]): string {
  if (!allowedPages || allowedPages.length === 0) return 'Full access to all sections';
  return allowedPages.map((p) => PAGE_LABELS[p] || p).join(', ');
}

// A short, plain notice on every internal-account email — reads as normal
// business correspondence rather than a marketing blast, which also helps
// keep these out of spam folders (no urgency language, no excessive
// formatting/links, a real named sender).
const CONFIDENTIALITY_NOTICE = `
  <p style="margin-top:20px;color:#6b7280;font-size:11px;line-height:1.6;">
    This email contains confidential account information intended only for the named recipient. If you weren't
    expecting this message, please ignore it and let your organization admin know. This is a one-time account
    notification, not a recurring or promotional email.
  </p>
`;

export function buildWelcomeAgentEmail(input: {
  fullName: string;
  email: string;
  tempPassword: string | null;
  role: string;
  allowedPages: string[];
  orgName: string;
  loginUrl: string;
}): SendMailInput['html'] {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Welcome to ${input.orgName} on Prowexa</h2>
      <p>Hi ${input.fullName},</p>
      <p>${
        input.tempPassword
          ? `An account has been created for you on <strong>${input.orgName}</strong>'s Prowexa WhatsApp workspace. Here are your login details:`
          : `You've been added to <strong>${input.orgName}</strong>'s Prowexa WhatsApp workspace. Log in with your existing Prowexa account:`
      }</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;">
        <tr>
          <td style="padding:10px 14px;color:#6b7280;">Login Email</td>
          <td style="padding:10px 14px;text-align:right;font-weight:bold;">${input.email}</td>
        </tr>
        ${
          input.tempPassword
            ? `<tr>
          <td style="padding:10px 14px;color:#6b7280;">Temporary Password</td>
          <td style="padding:10px 14px;text-align:right;font-weight:bold;font-family:monospace;">${input.tempPassword}</td>
        </tr>`
            : ''
        }
        <tr>
          <td style="padding:10px 14px;color:#6b7280;">Role</td>
          <td style="padding:10px 14px;text-align:right;font-weight:bold;">${input.role}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280;">Access</td>
          <td style="padding:10px 14px;text-align:right;font-weight:bold;">${describeAccess(input.allowedPages)}</td>
        </tr>
      </table>
      <p><a href="${input.loginUrl}" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Log In to Dashboard</a></p>
      ${input.tempPassword ? `<p>Please log in and change your password at your earliest convenience from your Profile page.</p>` : ''}
      ${CONFIDENTIALITY_NOTICE}
      ${EMAIL_FOOTER}
    </div>
  `;
}

export function buildAccessUpdatedEmail(input: {
  fullName: string;
  role: string;
  allowedPages: string[];
  orgName: string;
  loginUrl: string;
}): SendMailInput['html'] {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Your Account Access Was Updated</h2>
      <p>Hi ${input.fullName},</p>
      <p>Your account role or permissions on <strong>${input.orgName}</strong>'s Prowexa workspace were just updated by your organization admin. Your current access is now:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;">
        <tr>
          <td style="padding:10px 14px;color:#6b7280;">Role</td>
          <td style="padding:10px 14px;text-align:right;font-weight:bold;">${input.role}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280;">Access</td>
          <td style="padding:10px 14px;text-align:right;font-weight:bold;">${describeAccess(input.allowedPages)}</td>
        </tr>
      </table>
      <p><a href="${input.loginUrl}" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Open Dashboard</a></p>
      <p>If this change is unexpected, please reach out to your organization admin.</p>
      ${CONFIDENTIALITY_NOTICE}
      ${EMAIL_FOOTER}
    </div>
  `;
}

export function buildAccountStatusEmail(input: {
  fullName: string;
  isActive: boolean;
  orgName: string;
  loginUrl: string;
}): SendMailInput['html'] {
  return input.isActive
    ? `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Your Account Has Been Reactivated</h2>
      <p>Hi ${input.fullName},</p>
      <p>Your account on <strong>${input.orgName}</strong>'s Prowexa workspace has been reactivated. You can log back in now.</p>
      <p><a href="${input.loginUrl}" style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Log In to Dashboard</a></p>
      ${CONFIDENTIALITY_NOTICE}
      ${EMAIL_FOOTER}
    </div>
  `
    : `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Your Account Has Been Deactivated</h2>
      <p>Hi ${input.fullName},</p>
      <p>Your access to <strong>${input.orgName}</strong>'s Prowexa workspace has been deactivated by your organization admin. You will not be able to log in until it's reactivated.</p>
      <p>If you believe this is a mistake, please reach out to your organization admin directly.</p>
      ${CONFIDENTIALITY_NOTICE}
      ${EMAIL_FOOTER}
    </div>
  `;
}

export function buildSupportTicketReceivedEmail(input: {
  fullName: string;
  ticketNumber: string;
  subject: string;
}): SendMailInput['html'] {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>We've Received Your Support Request</h2>
      <p>Hi ${input.fullName},</p>
      <p>Thank you for reaching out to Prowexa Support. Your ticket has been logged and a member of our support team will get in touch with you shortly.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:8px;">
        <tr>
          <td style="padding:10px 14px;color:#6b7280;">Ticket Number</td>
          <td style="padding:10px 14px;text-align:right;font-weight:bold;font-family:monospace;">${input.ticketNumber}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;color:#6b7280;">Subject</td>
          <td style="padding:10px 14px;text-align:right;font-weight:bold;">${input.subject}</td>
        </tr>
      </table>
      <p><strong>Our support executive will contact you within 24 hours.</strong></p>
      <p>You can track this ticket and reply to it anytime from your Profile page's Support Portal.</p>
      ${EMAIL_FOOTER}
    </div>
  `;
}

const LEAD_SOURCE_LABELS: Record<string, string> = {
  popup: 'Website Popup',
  contact_page: 'Contact Page',
  demo_page: 'Book a Demo Page',
};

export function buildLeadReceivedEmail(input: { name: string; source: string }): SendMailInput['html'] {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Thanks for Reaching Out, ${input.name}!</h2>
      <p>We've received your ${input.source === 'demo_page' ? 'demo request' : 'message'} and a member of our team will get back to you shortly.</p>
      <p><strong>Our team will contact you within 24 hours.</strong></p>
      ${EMAIL_FOOTER}
    </div>
  `;
}

export function buildNewLeadNotificationEmail(input: {
  name: string;
  email: string;
  phoneNumber?: string | null;
  source: string;
  whatsappConsent?: boolean | null;
  company?: string | null;
  industry?: string | null;
  messageVolume?: string | null;
  message?: string | null;
}): SendMailInput['html'] {
  const rows: Array<[string, string]> = [
    ['Name', input.name],
    ['Email', input.email],
    ['Phone', input.phoneNumber || '—'],
    ['Source', LEAD_SOURCE_LABELS[input.source] || input.source],
  ];
  if (input.company) rows.push(['Company', input.company]);
  if (input.industry) rows.push(['Industry', input.industry]);
  if (input.messageVolume) rows.push(['Monthly Message Volume', input.messageVolume]);
  if (input.whatsappConsent !== null && input.whatsappConsent !== undefined) {
    rows.push(['WhatsApp Notification Consent', input.whatsappConsent ? 'Yes' : 'No']);
  }

  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>New Website Lead</h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:8px 0;color:#6b7280;">${label}</td><td style="padding:8px 0;text-align:right;font-weight:bold;">${value}</td></tr>`
          )
          .join('')}
      </table>
      ${input.message ? `<p><strong>Message:</strong><br>${input.message}</p>` : ''}
      <p style="color:#6b7280;font-size:12px;">View this and all other leads in the SuperAdmin panel's Website Leads tab.</p>
    </div>
  `;
}
