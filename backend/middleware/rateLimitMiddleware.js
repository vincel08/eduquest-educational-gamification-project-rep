import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

function buildLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
      errors: [],
    },
    // Express 5 / proxy-safe defaults; trust proxy can be enabled at the app level in production.
    validate: { xForwardedForHeader: false },
  });
}

export const authRateLimiter = buildLimiter({
  windowMs: env.rateLimit.authWindowMs,
  max: env.rateLimit.authMax,
  message: 'Too many authentication attempts. Please try again later.',
});

export const aiRateLimiter = buildLimiter({
  windowMs: env.rateLimit.aiWindowMs,
  max: env.rateLimit.aiMax,
  message: 'Too many AI requests. Please try again later.',
});
