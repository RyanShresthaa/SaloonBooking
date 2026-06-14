import Redis from 'ioredis';
import env from './Env.js';
import logger from '../utils/Logger.js';

// ─── Setup ───
// Bull expects `maxRetriesPerRequest: null` for blocking commands.

const redisConfig = env.redis.url
  ? {
      url: env.redis.url,
      maxRetriesPerRequest: null,
    }
  : {
      host: env.redis.host,
      port: env.redis.port,
      maxRetriesPerRequest: null,
    };

const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis error:', err);
});

// ─── Exports ───

export default redisClient;
