import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  forgotPasswordSchema,
  googleSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema
} from "./auth.validators.js";
import { authService } from "./auth.service.js";
import { requireAuth, type AuthenticatedRequest } from "../chat/chat.auth.js";
import { API_ERROR_CODES } from "@chatnet/shared";
import { withErrorBoundary } from "../../lib/http-errors.js";

const loginLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

const resetLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false
});

export const authRouter = Router();

const AUTH_BAD_REQUEST_ERRORS = [
  API_ERROR_CODES.EMAIL_EXISTS,
  API_ERROR_CODES.INVALID_CREDENTIALS,
  API_ERROR_CODES.USERNAME_TAKEN,
  API_ERROR_CODES.USERNAME_INVALID_FORMAT,
  API_ERROR_CODES.INVALID_TOKEN
] as const;

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(() => authService.register(parsed.data), res, {
    badRequest: AUTH_BAD_REQUEST_ERRORS,
    customStatus: (code) => (code.startsWith(API_ERROR_CODES.INVALID_GOOGLE_TOKEN) ? 400 : undefined)
  });
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(() => authService.login(parsed.data), res, {
    badRequest: AUTH_BAD_REQUEST_ERRORS,
    customStatus: (code) => (code.startsWith(API_ERROR_CODES.INVALID_GOOGLE_TOKEN) ? 400 : undefined)
  });
});

authRouter.post("/google", loginLimiter, async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(() => authService.loginWithGoogle(parsed.data), res, {
    badRequest: AUTH_BAD_REQUEST_ERRORS,
    customStatus: (code) => (code.startsWith(API_ERROR_CODES.INVALID_GOOGLE_TOKEN) ? 400 : undefined)
  });
});

authRouter.post("/forgot-password", resetLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(() => authService.requestPasswordReset(parsed.data), res, {
    badRequest: AUTH_BAD_REQUEST_ERRORS,
    customStatus: (code) => (code.startsWith(API_ERROR_CODES.INVALID_GOOGLE_TOKEN) ? 400 : undefined)
  });
});

authRouter.post("/reset-password", resetLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(() => authService.resetPassword(parsed.data), res, {
    badRequest: AUTH_BAD_REQUEST_ERRORS,
    customStatus: (code) => (code.startsWith(API_ERROR_CODES.INVALID_GOOGLE_TOKEN) ? 400 : undefined)
  });
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  return withErrorBoundary(() => authService.getProfile(userId), res, {
    badRequest: AUTH_BAD_REQUEST_ERRORS,
    customStatus: (code) => (code.startsWith(API_ERROR_CODES.INVALID_GOOGLE_TOKEN) ? 400 : undefined)
  });
});

authRouter.patch("/profile", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(() => authService.updateProfile(userId, parsed.data), res, {
    badRequest: AUTH_BAD_REQUEST_ERRORS,
    customStatus: (code) => (code.startsWith(API_ERROR_CODES.INVALID_GOOGLE_TOKEN) ? 400 : undefined)
  });
});