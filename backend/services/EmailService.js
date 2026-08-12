import nodemailer from 'nodemailer';
import env from '../config/env.js';

let transporter = null;

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
    });
  }
  return transporter;
}

const EmailService = {
  isConfigured() {
    return Boolean(env.mail.host);
  },

  /**
   * Send password reset email. Never log the raw token or full reset URL.
   */
  async sendPasswordResetEmail({ to, firstName, resetUrl }) {
    const subject = 'EduWow Password Reset Request';
    const greetingName = firstName || 'there';
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

    const mail = getTransporter();
    if (!mail) {
      if (!env.isProduction) {
        console.info(
          `[EmailService] MAIL not configured. Password reset email for ${to} was not delivered via SMTP.`
        );
      }
      return { delivered: false, mode: 'unconfigured' };
    }

    await mail.sendMail({
      from: env.mail.from,
      to,
      subject,
      text,
      html,
    });

    return { delivered: true, mode: 'smtp' };
  },
};

export default EmailService;
