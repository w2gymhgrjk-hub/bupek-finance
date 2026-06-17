import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(
  toEmail: string,
  toName: string,
  resetToken: string
): Promise<void> {
  // In development with no SMTP config — just log the link
  if (env.isDev && !env.SMTP_USER) {
    const link = `http://localhost:3000/auth/reset-password?token=${resetToken}`;
    logger.info(`[MAIL DEV] Password reset link for ${toEmail}: ${link}`);
    return;
  }

  const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset — BUPEK Finance</title>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1E3A5F,#1D4ED8);padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;font-size:22px;font-weight:900;margin:0;letter-spacing:1px;">BUPEK FINANCE LIMITED</h1>
          <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:6px 0 0;">Microfinance Management System</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <h2 style="color:#111827;font-size:20px;margin:0 0 12px;">Password Reset Request</h2>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px;">
            Hello <strong>${toName}</strong>,<br><br>
            We received a request to reset the password for your BUPEK Finance account.
            Click the button below to set a new password. This link is valid for <strong>1 hour</strong>.
          </p>

          <!-- Button -->
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetLink}"
               style="background:#1D4ED8;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:700;display:inline-block;">
              Reset My Password
            </a>
          </div>

          <p style="color:#6B7280;font-size:13px;line-height:1.6;margin:0 0 8px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color:#1D4ED8;font-size:12px;word-break:break-all;margin:0 0 28px;">
            ${resetLink}
          </p>

          <div style="background:#FEF3C7;border:1px solid #FCD34D;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
            <p style="color:#92400E;font-size:13px;margin:0;">
              ⚠ If you did not request this reset, please ignore this email.
              Your password will remain unchanged.
            </p>
          </div>

          <p style="color:#9CA3AF;font-size:12px;margin:0;">
            For security, this link will expire in 1 hour. If you need a new link, use the "Forgot Password" option on the login page.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:20px 40px;text-align:center;">
          <p style="color:#9CA3AF;font-size:12px;margin:0;">
            BUPEK Finance Limited · Microfinance Management System<br>
            This email was sent automatically. Please do not reply to this address.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: toEmail,
      subject: 'Password Reset — BUPEK Finance System',
      html,
      text: `Hello ${toName},\n\nReset your BUPEK Finance password:\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you did not request this reset, please ignore this email.`,
    });
    logger.info(`Password reset email sent to ${toEmail}: ${info.messageId}`);
  } catch (err: any) {
    logger.error(`Failed to send password reset email to ${toEmail}:`, err.message);
    throw new Error('EMAIL_SEND_FAILED');
  }
}

export async function sendPasswordChangedEmail(toEmail: string, toName: string): Promise<void> {
  if (env.isDev && !env.SMTP_USER) {
    logger.info(`[MAIL DEV] Password changed notification for ${toEmail}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: toEmail,
      subject: 'Your BUPEK Finance password was changed',
      text: `Hello ${toName},\n\nYour BUPEK Finance password was successfully changed. If you did not make this change, contact your system administrator immediately.`,
      html: `<p>Hello <strong>${toName}</strong>,</p><p>Your BUPEK Finance password was successfully changed on ${new Date().toLocaleString()}.</p><p>If you did not make this change, contact your system administrator immediately.</p>`,
    });
  } catch (err: any) {
    logger.warn(`Could not send password-changed notification to ${toEmail}: ${err.message}`);
    // Non-fatal — don't throw
  }
}
