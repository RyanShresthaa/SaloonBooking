import nodemailer from 'nodemailer';
import env from '../config/Env.js';
import logger from './Logger.js';

function buildSmtpTransport() {
  const smtpPort = Number(env.email.port) || 587;
  const smtpSecure = smtpPort === 465;
  const hostLower = (env.email.host || '').trim().toLowerCase();
  const isGmailSmtp = hostLower.includes('gmail.com') || hostLower.includes('googlemail.com');
  return nodemailer.createTransport({
    pool: false,
    host: env.email.host,
    port: smtpPort,
    secure: smtpSecure,
    requireTLS: !smtpSecure && Boolean(env.email.host?.trim()) && !isGmailSmtp,
    connectionTimeout: 15000,
    greetingTimeout: 12000,
    socketTimeout: 20000,
    auth: {
      user: env.email.user,
      pass: env.email.pass,
    },
  });
}

/** Lazy SMTP transport — avoids creating a client when only Resend is used. */
let smtpTransport;
function getSmtpTransport() {
  if (!smtpTransport && env.email.host?.trim()) {
    smtpTransport = buildSmtpTransport();
  }
  return smtpTransport;
}

async function sendEmailViaResend({ to, subject, html }) {
  const from = env.emailFrom || 'Salon App <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body.message || body.name || `Resend HTTP ${res.status}`;
    const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    err.statusCode = res.status;
    throw err;
  }
  const id = body.id || body.data?.id;
  logger.info(`Email sent via Resend to ${to}${id ? `: ${id}` : ''}`);
  return body;
}

/** Resend API vs SMTP — see `MAIL_PROVIDER` in Env.js / `.env.example`. */
function useResendForSend() {
  if (env.mailProvider === 'resend') return true;
  if (env.mailProvider === 'smtp') return false;
  return Boolean(env.resendApiKey);
}

const sendEmail = async ({ to, subject, html }) => {
  if (useResendForSend()) {
    if (!env.resendApiKey) {
      const err = new Error(
        'MAIL_PROVIDER=resend (or auto with Resend) requires RESEND_API_KEY. Set the key or use MAIL_PROVIDER=smtp with EMAIL_*.'
      );
      err.statusCode = 500;
      throw err;
    }
    try {
      return await sendEmailViaResend({ to, subject, html });
    } catch (error) {
      logger.error(`Failed to send email via Resend to ${to}:`, error);
      throw error;
    }
  }

  const transporter = getSmtpTransport();
  if (!transporter) {
    const err = new Error(
      'SMTP not configured (set EMAIL_HOST + EMAIL_USER + EMAIL_PASS) or use Resend (RESEND_API_KEY + MAIL_PROVIDER=auto|resend).'
    );
    err.statusCode = 500;
    throw err;
  }

  const mailOptions = {
    from: `"Salon App" <${env.email.user}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent via SMTP to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email via SMTP to ${to}:`, error);
    throw error;
  }
};

const buildVerificationEmail = (verificationUrl) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify Your Email</h2>
      <p>Thank you for registering with Salon App. Please click the button below to verify your email address.</p>
      <a href="${verificationUrl}" 
         style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px;">
        Verify Email
      </a>
      <p style="margin-top: 16px; color: #666;">This link expires in 24 hours.</p>
      <p style="color: #666;">If you did not create an account, please ignore this email.</p>
    </div>
  `;
};

const buildPasswordResetEmail = (resetUrl) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>We received a request to reset the password for your Salon account. Click the button below to choose a new password.</p>
      <a href="${resetUrl}"
         style="display: inline-block; padding: 12px 24px; background-color: #292524; color: #fafaf9; text-decoration: none; border-radius: 6px;">
        Reset password
      </a>
      <p style="margin-top: 16px; color: #666;">This link expires in one hour.</p>
      <p style="color: #666;">If you did not request this, you can ignore this email.</p>
    </div>
  `;
};

const buildAppointmentEmail = (templateBody, data) => {
  let body = templateBody;
  Object.entries(data).forEach(([key, value]) => {
    const str = value === undefined || value === null ? '' : String(value);
    body = body.replace(new RegExp(`{{${key}}}`, 'g'), str);
  });
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${body}</div>`;
};

const VIP_BANNER_HTML = `
<div style="background:linear-gradient(135deg,#fef9c3,#fde68a);border:1px solid #ca8a04;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
  <strong style="color:#854d0e;">VIP guest</strong>
  <span style="color:#713f12;"> — priority check-in, welcome refreshment, and our team’s full attention to detail.</span>
</div>`;

/** Wraps template HTML with optional VIP banner and safe {{vipExtra}} (empty for non-VIP). */
const renderAppointmentEmail = (templateBody, appointmentData = {}) => {
  const isVip = Boolean(appointmentData.isVip);
  const data = {
    customerName: appointmentData.customerName || 'Valued Customer',
    serviceName: appointmentData.serviceName || '',
    date: appointmentData.date || '',
    time: appointmentData.time || '',
    vipExtra: isVip
      ? '<em style="color:#713f12;">Your visit includes VIP scheduling priority and complimentary refreshments.</em>'
      : '',
  };
  const banner = isVip ? VIP_BANNER_HTML : '';
  return banner + buildAppointmentEmail(templateBody, data);
};

const buildAppointmentReminder24hHtml = ({ customerName, serviceName, date, time, manageUrl }) => {
  const name = customerName || 'there';
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color:#1c1917;">Reminder: appointment tomorrow</h2>
      <p>Hi ${name}, this is a friendly reminder about your visit at the salon.</p>
      <ul style="line-height:1.6;color:#44403c;">
        <li><strong>Service:</strong> ${serviceName || '—'}</li>
        <li><strong>Date:</strong> ${date}</li>
        <li><strong>Time:</strong> ${time}</li>
      </ul>
      <p style="margin-top:16px;">Need to make a change? Please use your account or call us as soon as possible.</p>
      ${
        manageUrl
          ? `<p><a href="${manageUrl}" style="display:inline-block;padding:10px 18px;background:#1c1917;color:#fafaf9;text-decoration:none;border-radius:6px;">View booking</a></p>`
          : ''
      }
    </div>
  `;
};

/**
 * Safe for /health — no secrets. Shows whether Resend/SMTP env looks configured and which transport sendEmail() will use.
 */
export function getPublicMailStatus() {
  const host = env.email?.host?.trim();
  const user = env.email?.user?.trim();
  const h = (host || '').toLowerCase();
  const loopback = h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '0.0.0.0';
  const smtpConfigured = Boolean(host && user && !loopback);
  const resendConfigured = Boolean(env.resendApiKey);
  let transport;
  if (env.mailProvider === 'resend') transport = resendConfigured ? 'resend' : 'none';
  else if (env.mailProvider === 'smtp') transport = smtpConfigured ? 'smtp' : 'none';
  else transport = resendConfigured ? 'resend' : smtpConfigured ? 'smtp' : 'none';

  return {
    mailProvider: env.mailProvider,
    resendConfigured,
    emailFromConfigured: Boolean(env.emailFrom),
    smtpConfigured,
    transport,
    emailVerificationRequired: env.authEmailVerificationRequired,
  };
}

export {
  sendEmail,
  buildVerificationEmail,
  buildPasswordResetEmail,
  buildAppointmentEmail,
  renderAppointmentEmail,
  buildAppointmentReminder24hHtml,
};
