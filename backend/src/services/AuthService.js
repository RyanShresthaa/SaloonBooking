import { User, sequelize } from '../models/Index.js';
import { generateToken, generateShortToken, generatePasswordResetToken, verifyToken } from '../utils/tokenHelper.js';
import { sendEmail, buildVerificationEmail, buildPasswordResetEmail } from '../utils/emailHelper.js';
import env from '../config/Env.js';
import logger from '../utils/Logger.js';

/** Avoid leaking JWT reset/verify tokens in server logs. */
function redactUrlToken(url) {
  try {
    const u = new URL(url);
    if (u.searchParams.has('token')) u.searchParams.set('token', '(redacted)');
    return u.toString();
  } catch {
    return '[invalid url]';
  }
}

/** Hosts that look "configured" in .env but cannot receive mail on cloud hosts (e.g. Render). */
function isLoopbackSmtpHost(host) {
  const h = (host || '').trim().toLowerCase();
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '0.0.0.0';
}

/** True when EMAIL_HOST + EMAIL_USER look like a real remote SMTP setup. */
function isSmtpConfigured() {
  const host = env.email?.host?.trim();
  const user = env.email?.user?.trim();
  if (!host || !user || isLoopbackSmtpHost(host)) return false;
  return true;
}

/** Outbound mail: `resend` = API only; `smtp` = nodemailer only; `auto` = Resend when RESEND_API_KEY set else SMTP. */
function isOutboundEmailConfigured() {
  if (env.mailProvider === 'resend') return Boolean(env.resendApiKey);
  if (env.mailProvider === 'smtp') return isSmtpConfigured();
  return Boolean(env.resendApiKey) || isSmtpConfigured();
}

class AuthService {
  async register({ name, email, password }) {
    const emailNorm = (email || '').trim().toLowerCase();
    const existing = await User.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), emailNorm),
    });

    if (!env.authEmailVerificationRequired) {
      if (existing?.isEmailVerified === true) {
        const error = new Error('Email is already in use');
        error.statusCode = 400;
        throw error;
      }
      let user;
      if (existing) {
        await existing.update({
          name,
          password,
          isEmailVerified: true,
          emailVerificationToken: null,
        });
        user = await existing.reload();
      } else {
        user = await User.create({
          name,
          email,
          password,
          isEmailVerified: true,
          emailVerificationToken: null,
        });
      }
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerificationSkipped: true,
        verificationEmailSent: false,
        verificationEmailQueued: false,
      };
    }

    // --- Email verification flow (AUTH_EMAIL_VERIFICATION_REQUIRED=1) ---
    // Fully registered = email verified. Unverified (or pending) accounts can complete signup again.
    if (existing?.isEmailVerified === true) {
      const error = new Error('Email is already in use');
      error.statusCode = 400;
      throw error;
    }

    let user;
    if (existing && existing.isEmailVerified !== true) {
      const verificationToken = generateShortToken({ id: existing.id, purpose: 'email-verification' });
      await existing.update({
        name,
        password,
        emailVerificationToken: verificationToken,
      });
      user = await existing.reload();
    } else {
      user = await User.create({ name, email, password });
      const verificationToken = generateShortToken({ id: user.id, purpose: 'email-verification' });
      await user.update({ emailVerificationToken: verificationToken });
      await user.reload();
    }

    const verificationUrl = `${env.clientUrl}/verify-email?token=${user.emailVerificationToken}`;

    let verificationEmailSent = false;
    let verificationEmailQueued = false;
    if (isOutboundEmailConfigured()) {
      /** Do not await mail transport — avoids long hangs when SMTP times out (e.g. Render → Gmail). */
      verificationEmailQueued = true;
      void sendEmail({
        to: user.email,
        subject: 'Verify your Salon App account',
        html: buildVerificationEmail(verificationUrl),
      })
        .then(() => {
          logger.info(`[auth] Verification email sent to ${user.email}`);
        })
        .catch((err) => {
          logger.error(`Failed to send verification email to ${user.email}:`, err);
          const reason = err?.code || err?.message || 'unknown';
          logger.warn(
            `[auth] Verification email not delivered (${reason}). Debug link (token redacted) for ${user.email}: ${redactUrlToken(verificationUrl)}`
          );
        });
    } else {
      logger.warn(
        `[auth] No outbound email configured (${env.nodeEnv}); user created without verification email. Debug link: ${redactUrlToken(verificationUrl)}`
      );
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerificationSkipped: false,
      verificationEmailSent,
      verificationEmailQueued,
    };
  }

  async verifyEmail(token) {
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      const error = new Error('Invalid or expired verification token');
      error.statusCode = 400;
      throw error;
    }

    if (decoded.purpose !== 'email-verification') {
      const error = new Error('Invalid token purpose');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findOne({
      where: { id: decoded.id, emailVerificationToken: token },
    });

    if (!user) {
      const error = new Error('Invalid or already used verification token');
      error.statusCode = 400;
      throw error;
    }

    await user.update({ isEmailVerified: true, emailVerificationToken: null });
  }

  /**
   * Resend verification link. Same response whether user exists / is verified (no email enumeration).
   */
  async resendVerificationEmail({ email }) {
    if (!env.authEmailVerificationRequired) {
      return { ok: true };
    }
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm) {
      return { ok: true };
    }

    const user = await User.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), emailNorm),
    });

    if (!user || user.isEmailVerified) {
      return { ok: true };
    }

    const verificationToken = generateShortToken({ id: user.id, purpose: 'email-verification' });
    await user.update({ emailVerificationToken: verificationToken });

    const verificationUrl = `${env.clientUrl}/verify-email?token=${verificationToken}`;

    if (isOutboundEmailConfigured()) {
      void sendEmail({
        to: user.email,
        subject: 'Verify your Salon App account',
        html: buildVerificationEmail(verificationUrl),
      })
        .then(() => logger.info(`[auth] resend-verification: email sent to ${user.email}`))
        .catch((err) => {
          logger.error(`Failed to send verification email to ${user.email}:`, err);
          const reason = err?.code || err?.message || 'unknown';
          logger.warn(
            `[auth] resend-verification: email not delivered (${reason}). Debug link for ${user.email}: ${redactUrlToken(verificationUrl)}`
          );
        });
    } else {
      logger.warn(
        `[auth] No outbound email configured; resend skipped. Debug link for ${user.email}: ${redactUrlToken(verificationUrl)}`
      );
    }

    return { ok: true };
  }

  async updateProfile(userId, data) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    const patch = {};
    if (data.name !== undefined) {
      const n = String(data.name || '').trim();
      if (n.length > 0) patch.name = n;
    }
    if (data.clientNotes !== undefined) patch.clientNotes = data.clientNotes;
    if (data.allergies !== undefined) patch.allergies = data.allergies;
    if (data.marketingEmailOptIn !== undefined) patch.marketingEmailOptIn = Boolean(data.marketingEmailOptIn);
    if (Object.keys(patch).length === 0) {
      return user;
    }
    await user.update(patch);
    return user.reload();
  }

  /**
   * Always returns success message (do not reveal whether email exists).
   */
  async requestPasswordReset({ email }) {
    const emailNorm = (email || '').trim().toLowerCase();
    if (!emailNorm) {
      return { ok: true };
    }

    const user = await User.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), emailNorm),
    });

    if (!user) {
      return { ok: true };
    }

    const resetToken = generatePasswordResetToken({ id: user.id, purpose: 'password-reset' });
    const resetUrl = `${env.clientUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    if (!isOutboundEmailConfigured()) {
      logger.warn('[auth] No outbound email configured; password reset email not sent.');
      return { ok: true };
    }

    await user.update({ passwordResetToken: resetToken });

    void sendEmail({
      to: user.email,
      subject: 'Reset your Salon password',
      html: buildPasswordResetEmail(resetUrl),
    })
      .then(() => logger.info(`[auth] Password reset email sent to ${user.email}`))
      .catch(async (err) => {
        await user.update({ passwordResetToken: null });
        logger.error(`Failed to send password reset email to ${user.email}:`, err);
        if (env.nodeEnv !== 'production') {
          logger.warn(
            `[dev] Skipping reset email (SMTP error). Reset link for ${user.email}: ${redactUrlToken(resetUrl)}`
          );
        }
      });

    return { ok: true };
  }

  async resetPassword({ token, password }) {
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      const error = new Error('Invalid or expired reset link');
      error.statusCode = 400;
      throw error;
    }

    if (decoded.purpose !== 'password-reset') {
      const error = new Error('Invalid token purpose');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findOne({
      where: { id: decoded.id, passwordResetToken: token },
    });

    if (!user) {
      const error = new Error('Invalid or already used reset link');
      error.statusCode = 400;
      throw error;
    }

    await user.update({
      password,
      passwordResetToken: null,
      isEmailVerified: true,
    });
  }

  async login({ email, password }) {
    const emailNorm = (email || '').trim().toLowerCase();
    const user = await User.findOne({
      where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), emailNorm),
    });

    if (!user || !(await user.comparePassword(password))) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    if (env.authEmailVerificationRequired && !user.isEmailVerified) {
      const error = new Error('Please verify your email before logging in');
      error.statusCode = 403;
      throw error;
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        loyaltyPoints: user.loyaltyPoints ?? 0,
        marketingEmailOptIn: user.marketingEmailOptIn !== false,
      },
    };
  }
}

export default new AuthService();
