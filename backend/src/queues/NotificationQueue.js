import Bull from 'bull';
import env from '../config/Env.js';

const redisConfig = env.redis.url
  ? env.redis.url
  : {
      host: env.redis.host,
      port: env.redis.port,
    };

const notificationQueue = new Bull('notification', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: env.nodeEnv === 'production' ? 3 : 1,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

export default notificationQueue;
