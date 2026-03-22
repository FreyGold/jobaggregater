import * as IORedisModule from 'ioredis';
import { config } from '../config/unifiedConfig.js';

const RedisCtor = IORedisModule.Redis ?? IORedisModule.default;

// Initialize Redis only if REDIS_URL is provided, else fallback to a mock instance or disable caching
export const redisClient = config.redisUrl 
  ? new RedisCtor(config.redisUrl)
  : null;

if (redisClient) {
  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Redis Client Connected'));
}

export class CacheService {
  private static readonly JOB_LIST_VERSION_KEY = 'jobs:list:version';

  static async get<T>(key: string): Promise<T | null> {
    if (!redisClient) return null;
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error(`Cache GET error for key ${key}:`, err);
      return null;
    }
  }

  static async set(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
    if (!redisClient) return;
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      console.error(`Cache SET error for key ${key}:`, err);
    }
  }

  static async del(key: string): Promise<void> {
    if (!redisClient) return;
    try {
      await redisClient.del(key);
    } catch (err) {
      console.error(`Cache DEL error for key ${key}:`, err);
    }
  }

  static async delPattern(pattern: string): Promise<void> {
    if (!redisClient) return;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (err) {
      console.error(`Cache DELPATTERN error for pattern ${pattern}:`, err);
    }
  }

  static async getListCacheVersion(): Promise<number> {
    if (!redisClient) return 1;
    try {
      const raw = await redisClient.get(this.JOB_LIST_VERSION_KEY);
      if (!raw) return 1;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : 1;
    } catch (err) {
      console.error('Cache get list version error:', err);
      return 1;
    }
  }

  static async bumpListCacheVersion(): Promise<number> {
    if (!redisClient) return 1;
    try {
      return await redisClient.incr(this.JOB_LIST_VERSION_KEY);
    } catch (err) {
      console.error('Cache bump list version error:', err);
      return 1;
    }
  }
}
