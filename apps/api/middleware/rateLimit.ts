import { Request, RequestHandler } from 'express';
import { AppError } from '../errors/AppError';

type RateLimitOptions = {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

const readNumber = (name: string, fallback: number) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
};

const getClientIp = (req: Request) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (Array.isArray(forwarded)) {
    return forwarded[0] || req.ip || 'unknown';
  }
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]?.trim() || req.ip || 'unknown';
  }
  return req.ip || 'unknown';
};

const getRateLimitKey = (req: Request, keyPrefix: string) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const ipAddress = getClientIp(req);
  return `${keyPrefix}:${email || ipAddress}`;
};

export const createRateLimit = ({ keyPrefix, windowMs, maxRequests }: RateLimitOptions): RequestHandler => {
  return (req, res, next) => {
    const now = Date.now();
    const key = getRateLimitKey(req, keyPrefix);
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      const nextEntry = {
        count: 1,
        resetAt: now + windowMs,
      };
      store.set(key, nextEntry);
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - nextEntry.count)));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(nextEntry.resetAt / 1000)));
      return next();
    }

    current.count += 1;
    store.set(key, current);

    const remaining = Math.max(0, maxRequests - current.count);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(current.resetAt / 1000)));

    if (current.count > maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return next(
        new AppError(
          `Too many requests. Retry in ${retryAfterSeconds} seconds.`,
          429,
          'RATE_LIMIT_EXCEEDED',
        ),
      );
    }

    return next();
  };
};

export const authRateLimit = createRateLimit({
  keyPrefix: 'auth',
  windowMs: readNumber('AUTH_RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000),
  maxRequests: readNumber('AUTH_RATE_LIMIT_MAX_REQUESTS', 20),
});

export const queueReportRateLimit = createRateLimit({
  keyPrefix: 'queue-report',
  windowMs: readNumber('QUEUE_REPORT_RATE_LIMIT_WINDOW_MS', 10 * 60 * 1000),
  maxRequests: readNumber('QUEUE_REPORT_RATE_LIMIT_MAX_REQUESTS', 15),
});

export const locationReadRateLimit = createRateLimit({
  keyPrefix: 'location-read',
  windowMs: readNumber('LOCATION_READ_RATE_LIMIT_WINDOW_MS', 60 * 1000),
  maxRequests: readNumber('LOCATION_READ_RATE_LIMIT_MAX_REQUESTS', 120),
});

export const adminRateLimit = createRateLimit({
  keyPrefix: 'admin',
  windowMs: readNumber('ADMIN_RATE_LIMIT_WINDOW_MS', 60 * 1000),
  maxRequests: readNumber('ADMIN_RATE_LIMIT_MAX_REQUESTS', 60),
});
