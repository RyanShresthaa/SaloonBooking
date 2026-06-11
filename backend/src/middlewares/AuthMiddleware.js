import { verifyToken } from '../utils/tokenHelper.js';
import { sendUnauthorized, sendForbidden } from '../utils/apiResponse.js';
import { User } from '../models/Index.js';
import env from '../config/Env.js';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendUnauthorized(res, 'No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return sendUnauthorized(res, 'User no longer exists');
    }

    if (env.authEmailVerificationRequired && !user.isEmailVerified) {
      return sendForbidden(res, 'Please verify your email before accessing this resource');
    }

    req.user = user;
    next();
  } catch (error) {
    return sendUnauthorized(res, 'Invalid or expired token');
  }
};

/**
 * Restrict access to specific roles
 * @param {...string} roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return sendForbidden(res, 'You do not have permission to perform this action');
    }
    next();
  };
};

export { authenticate, authorize };
