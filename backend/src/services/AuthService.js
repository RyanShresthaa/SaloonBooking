import { User, sequelize } from '../models/Index.js';
import { generateToken, generateShortToken, generatePasswordResetToken, verifyToken } from '../utils/tokenHelper.js';
import { sendEmail, buildVerificationEmail, buildPasswordResetEmail } from '../utils/emailHelper.js';
import env from '../config/Env.js';
import logger from '../utils/Logger.js';

class AuthService {
  async register({ name, email, password }) {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      const error = new Error('Email is already in use');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.create({ name, email, password });

    const verificationToken = generateShortToken({ id: user.id, purpose: 'email-verification' });
    await user.update({ emailVerificationToken: verificationToken });

    const verificationUrl = `${env.clientUrl}/verify-email?token=${verificationToken}`;

    try {
      await sendEmail({
        to: email,
        subject: 'Verify your Salon App account',
        html: buildVerificationEmail(verificationUrl),
      });
    } catch (err) {
      if (env.nodeEnv === 'production') {
        throw err;
      }
      // Local dev: SMTP often unset — still create user; log link for testing
      logger.warn(
        `[dev] Skipping verification email (SMTP error). Verify URL for ${email}: ${verificationUrl}`
      );
    }

    return { id: user.id, name: user.name, email: user.email };
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

    try {
      await sendEmail({
        to: user.email,
        subject: 'Verify your Salon App account',
        html: buildVerificationEmail(verificationUrl),
      });
    } catch (err) {
      if (env.nodeEnv === 'production') {
        throw err;
      }
      logger.warn(
        `[dev] Skipping verification email (SMTP error). Verify URL for ${user.email}: ${verificationUrl}`
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
    await user.update({ passwordResetToken: resetToken });

    const resetUrl = `${env.clientUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Reset your Salon password',
        html: buildPasswordResetEmail(resetUrl),
      });
    } catch (err) {
      await user.update({ passwordResetToken: null });
      if (env.nodeEnv === 'production') {
        throw err;
      }
      logger.warn(`[dev] Skipping reset email (SMTP error). Reset URL for ${user.email}: ${resetUrl}`);
    }

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

    if (!user.isEmailVerified) {
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
