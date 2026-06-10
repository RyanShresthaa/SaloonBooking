import logger from '../utils/Logger.js';

const errorHandler = (err, req, res, next) => {
  logger.error(err);

  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors.map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

export { errorHandler, notFound };
