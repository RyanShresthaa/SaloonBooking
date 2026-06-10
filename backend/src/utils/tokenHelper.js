import jwt from 'jsonwebtoken';
import env from '../config/Env.js';

/**
 * Generate a signed JWT for a user
 * @param {object} payload - Data to encode (e.g. { id, email, role })
 * @returns {string} signed JWT
 */
const generateToken = (payload) => {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
};

/**
 * Verify and decode a JWT
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.jwt.secret);
};

/**
 * Generate a short-lived token for email verification or password reset
 * @param {object} payload
 * @returns {string} signed JWT (expires in 1 day)
 */
const generateShortToken = (payload) => {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: '1d' });
};

/** Short-lived JWT for password reset links */
const generatePasswordResetToken = (payload) => {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: '1h' });
};

export { generateToken, verifyToken, generateShortToken, generatePasswordResetToken };
