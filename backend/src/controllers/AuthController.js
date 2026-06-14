import authService from '../services/AuthService.js';
import { User, Appointment } from '../models/Index.js';
import { sendSuccess, sendCreated, sendBadRequest } from '../utils/apiResponse.js';
import env from '../config/Env.js';

// ─── Handlers ───

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register({ name, email, password });
    const message = result.emailVerificationSkipped
      ? 'Registration successful. You can sign in now.'
      : result.verificationEmailQueued
        ? 'Registration successful. A verification email is being sent — check your inbox and spam in the next minute.'
        : 'Registration successful. No verification email was scheduled. On hosts like Render, add RESEND_API_KEY (recommended) or working SMTP — Gmail SMTP often times out from the cloud.';
    return sendCreated(res, result, message);
  } catch (error) {
    next(error);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    if (!env.authEmailVerificationRequired) {
      return sendSuccess(
        res,
        null,
        'Email verification is not required on this server. Sign in with your password.'
      );
    }
    const { token } = req.query;
    if (!token) return sendBadRequest(res, 'Verification token is required');
    await authService.verifyEmail(token);
    return sendSuccess(res, null, 'Email verified successfully. You can now log in.');
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.resendVerificationEmail({ email });
    return sendSuccess(
      res,
      null,
      'If that account exists and is not verified yet, we sent a new verification link.'
    );
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    return sendSuccess(res, result, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const payload = await authService.formatAuthUser(req.user);
    return sendSuccess(res, payload, 'User profile retrieved');
  } catch (error) {
    next(error);
  }
};

const patchMe = async (req, res, next) => {
  try {
    await authService.updateProfile(req.user.id, req.body);
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'passwordResetToken', 'emailVerificationToken'] },
    });
    return sendSuccess(res, user, 'Profile updated');
  } catch (error) {
    next(error);
  }
};

const exportMyData = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'passwordResetToken', 'emailVerificationToken'] },
    });
    const appointments = await Appointment.findAll({
      where: { userId: req.user.id },
      include: [{ association: 'service', attributes: ['id', 'name', 'duration', 'price'] }],
      order: [['appointmentDate', 'DESC']],
    });
    return sendSuccess(res, { profile: user, appointments }, 'Your salon data export');
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.requestPasswordReset({ email });
    return sendSuccess(
      res,
      null,
      'If an account exists for that email, we sent instructions to reset your password.'
    );
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword({ token, password });
    return sendSuccess(res, null, 'Password updated. You can sign in with your new password.');
  } catch (error) {
    next(error);
  }
};

// ─── Exports ───

export {
  register,
  verifyEmail,
  resendVerification,
  login,
  getMe,
  patchMe,
  exportMyData,
  forgotPassword,
  resetPassword,
};
