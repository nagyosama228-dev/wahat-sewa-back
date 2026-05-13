import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // In development: very generous limit so hot-reloads / frequent navigation never hit 429
  // In production: strict 200 requests per 15 min
  max: isDev ? 2000 : 200,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isDev ? false : false, // always count, but limit is high in dev
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Dev: 100 auth attempts — production: strict 10
  max: isDev ? 100 : 10,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  // Dev: very lenient — production: 20 per hour
  max: isDev ? 500 : 20,
  message: { error: 'Rate limit exceeded for this endpoint' },
  standardHeaders: true,
  legacyHeaders: false,
});
