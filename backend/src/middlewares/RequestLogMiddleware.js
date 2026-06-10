import logger from '../utils/Logger.js';

const SLOW_MS = Number(process.env.SLOW_REQUEST_MS || 1200);

/**
 * Logs each request after the response is sent; warns on slow or server-error responses.
 */
const requestLogger = (req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - started;
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`;
    if (res.statusCode >= 500) {
      logger.error(line);
    } else if (ms >= SLOW_MS) {
      logger.warn(`Slow request (${ms}ms): ${line}`);
    } else if (process.env.NODE_ENV !== 'production') {
      logger.debug(line);
    }
  });
  next();
};

export default requestLogger;
