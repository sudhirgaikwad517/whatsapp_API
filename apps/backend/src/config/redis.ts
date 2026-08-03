import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 100, 3000);
    logger.warn(`Redis retry attempt #${times}, retrying in ${delay}ms`);
    return delay;
  },
});

redis.on('connect', () => logger.info('Redis connected.'));
redis.on('error', (err: Error) => logger.error({ err }, 'Redis connection error.'));

// Separate connection instance for BullMQ workers (cannot share)
export const createRedisConnection = () =>
  new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
