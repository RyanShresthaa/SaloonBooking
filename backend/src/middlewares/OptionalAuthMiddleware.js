import { verifyToken } from '../utils/tokenHelper.js';
import { User } from '../models/Index.js';
import env from '../config/Env.js';

/** Sets `req.user` when a valid Bearer token is present; otherwise continues without auth. */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return next();
    if (env.authEmailVerificationRequired && !user.isEmailVerified) {
      return next();
    }
    req.user = user;
    return next();
  } catch {
    return next();
  }
};

export { optionalAuthenticate };
