import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;

function parseFromAddress(from) {
  const raw = String(from || '').trim();
  const match = raw.match(/^(?:"?([^"<]*)"?\s*)?<([^>]+)>$/);
  if (match) {
    return {
      name: String(match[1] || 'EduWow').trim() || 'EduWow',
      email: String(match[2] || '').trim(),
    };
  }
  if (raw.includes('@')) {
    return { name: 'EduWow', email: raw };
  }
  return { name: 'EduWow', email: '' };
}

function getTransporter() {
  if (!env.mail.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: env.mail.user
        ? {
            user: env.mail.user,
            pass: env.mail.password,
          }
        : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      pool: true,
      maxConnections: 1,
      maxMessages: 20,
    });
  }
  return transporter;
}

function resetTransporter() {
  if (transporter) {
    try {
      transporter.close();
    } catch {
      // ignore
    }
  }
  transporter = null;
}

function buildResetContent({ firstName, resetUrl }) {
  const greetingName = firstName || 'there';
  const subject = 'EduWow Password Reset Request';
  const text = [
    'EduWow',
    '',
    'Password Reset Request',
    '',
    `Hi ${greetingName},`,
    '',
    'We received a request to reset your EduWow password.',
    'Use the link below to choose a new password:',
    resetUrl,
    '',
    'This link expires in 30 minutes.',
    '',
    'If you did not request a password reset, you can safely ignore this email.',
  ].join('\n');

  const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 8px;">EduWow</h2>
        <h3 style="margin: 0 0 16px;">Password Reset Request</h3>
        <p>Hi ${greetingName},</p>
        <p>We received a request to reset your EduWow password.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background:#4F46E5;color:#ffffff;padding:12px 18px;text-decoration:none;border-radius:8px;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p>This link expires in 30 minutes.</p>
        <p>If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `;

  return { subject, text, html };
}

async function sendViaBrevoApi({ to, firstName, resetUrl }) {
  const sender = parseFromAddress(env.mail.from);
  if (!sender.email) {
    throw new Error('MAIL_FROM must include a valid email address for Brevo API.');
  }

  const { subject, text, html } = buildResetContent({ firstName, resetUrl });
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': env.mail.brevoApiKey,
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to, name: firstName || undefined }],
      subject,
      htmlContent: html,
      textContent: text,
      tags: ['password-reset'],
    }),
  });

  const bodyText = await response.text();
  let payload = null;
  try {
    payload = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail =
      payload?.message || payload?.error || bodyText || response.statusText;
    throw new Error(`Brevo API ${response.status}: ${detail}`);
  }

  return { delivered: true, mode: 'brevo-api', messageId: payload?.messageId || null };
}

async function sendViaSmtp({ to, firstName, resetUrl }) {
  const mail = getTransporter();
  if (!mail) {
    console.error(
      `[EmailService] MAIL not configured. Password reset email for ${to} was not delivered.`,
    );
    return { delivered: false, mode: 'unconfigured' };
  }

  const { subject, text, html } = buildResetContent({ firstName, resetUrl });

  try {
    await mail.sendMail({
      from: env.mail.from,
      to,
      subject,
      text,
      html,
    });
    console.log(`[EmailService] Password reset email accepted by SMTP for ${to}`);
    return { delivered: true, mode: 'smtp' };
  } catch (error) {
    resetTransporter();
    console.error(
      `[EmailService] Failed to send password reset email to ${to}:`,
      error?.message || error,
    );
    throw error;
  }
}

const EmailService = {
  isConfigured() {
    return Boolean(env.mail.brevoApiKey || env.mail.host);
  },

  /**
   * Verify mail transport at startup (logs status only; never logs secrets).
   */
  async verifySmtp() {
    if (env.mail.brevoApiKey) {
      console.log('[EmailService] Brevo API key configured (HTTP transactional send).');
      return { ok: true, mode: 'brevo-api' };
    }

    const mail = getTransporter();
    if (!mail) {
      console.warn('[EmailService] MAIL_HOST / BREVO_API_KEY unset — password reset emails will not be sent.');
      return { ok: false, reason: 'unconfigured' };
    }

    try {
      await mail.verify();
      console.log(
        `[EmailService] SMTP ready (${env.mail.host}:${env.mail.port}, from=${env.mail.from})`,
      );
      return { ok: true, mode: 'smtp' };
    } catch (error) {
      resetTransporter();
      console.error(
        '[EmailService] SMTP verify failed — password reset emails will fail:',
        error?.message || error,
      );
      console.error(
        '[EmailService] Tip: on Railway set MAIL_PORT=2525, or prefer BREVO_API_KEY (HTTP API).',
      );
      return { ok: false, reason: error?.message || 'verify_failed' };
    }
  },

  /**
   * Send password reset email. Never log the raw token or full reset URL.
   */
  async sendPasswordResetEmail({ to, firstName, resetUrl }) {
    if (env.mail.brevoApiKey) {
      const result = await sendViaBrevoApi({ to, firstName, resetUrl });
      console.log(`[EmailService] Password reset email accepted by Brevo API for ${to}`);
      return result;
    }
    return sendViaSmtp({ to, firstName, resetUrl });
  },
};

export default EmailService;
