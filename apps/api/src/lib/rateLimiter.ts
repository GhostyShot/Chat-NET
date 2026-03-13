import rateLimit from "express-rate-limit";

/**
 * Strict limiter for auth endpoints (login, register, password reset).
 * Prevents brute-force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Zu viele Anfragen. Bitte warte 15 Minuten.",
  },
  skipSuccessfulRequests: false,
});

/**
 * Limiter for password-reset / forgot flows specifically.
 * Even stricter: 5 requests per 15 minutes.
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Zu viele Passwort-Reset-Anfragen. Bitte warte 15 Minuten.",
  },
});

/**
 * General API limiter — applied to all chat routes.
 * Prevents flooding/scraping.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Zu viele Anfragen. Bitte kurz warten.",
  },
  skipSuccessfulRequests: true,
});

/**
 * Strict limiter for message sending.
 * 60 messages per minute per IP — prevents spam.
 */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Zu viele Nachrichten. Kurz durchatmen.",
  },
});
