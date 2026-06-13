import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import * as redisService from '../services/redis.service';

interface LimiterOptions {
  windowMs: number;
  max: number;
  message: string;
}

/**
 * Creates an Express middleware that performs rate limiting.
 * It attempts to check limits via Upstash Redis. If Redis is unavailable or
 * unconfigured, it seamlessly falls back to standard in-memory rate limiting.
 */
const createRedisLimiter = (options: LimiterOptions) => {
  // Local memory fallback limiter
  const memoryLimiter = rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: { success: false, message: options.message },
    standardHeaders: true,
    legacyHeaders: false,
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const key = `ratelimit:${ip}:${req.baseUrl || 'global'}${req.path}`;

    try {
      const windowSec = Math.floor(options.windowMs / 1000);
      const results = await redisService.pipeline([
        ['INCR', key],
        ['TTL', key],
      ]);

      if (results && results.length === 2) {
        const hits = Number(results[0]);
        const ttl = Number(results[1]);

        // If the key is new or does not have a TTL, set expiration
        if (hits === 1 || ttl === -1) {
          await redisService.exec(['EXPIRE', key, String(windowSec)]);
        }

        // Set standard rate limiting response headers
        res.setHeader('X-RateLimit-Limit', options.max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - hits));

        if (hits > options.max) {
          return res.status(429).json({ success: false, message: options.message });
        }
        return next();
      }
    } catch (err) {
      console.warn('⚡ Upstash Redis rate limiter error, falling back to local memory rate limiting:', err);
    }

    // Fallback to local memory limiter
    return memoryLimiter(req, res, next);
  };
};

export const authLimiter = createRedisLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30, // Increase slightly for dev comfort
  message: 'Too many verification or login attempts. Please try again in 15 minutes.',
});

export const globalLimiter = createRedisLimiter({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: 'System is experiencing high traffic. Please slow down and try again.',
});
