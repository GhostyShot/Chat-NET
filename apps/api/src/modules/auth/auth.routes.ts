import { Router } from "express";
import { authService } from "./auth.service.js";
import { verifyGoogleIdToken } from "./auth.google.js";
import { sendPasswordResetEmail } from "./auth.mail.js";
import { buildAuthResponse } from "./auth.security.js";
import {
  registerSchema,
  loginSchema,
  googleSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema
} from "./auth.validators.js";
import { authLimiter, passwordResetLimiter } from "../../lib/rateLimiter.js";
import jwt from "jsonwebtoken";
import { appConfig } from "../../config.js";
import { authStore } from "./auth.store.js";
import { API_ERROR_CODES } from "@chatnet/shared";
import type { Request, Response, NextFunction } from "express";

export const authRouter = Router();

authRouter.use(authLimiter);

// Minimal inline requireAuth middleware (avoids circular import)
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ code: API_ERROR_CODES.AUTH_REQUIRED });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), appConfig.jwtAccessSecret) as { sub?: string };
    if (!payload.sub) throw new Error();
    (req as Request & { userId: string }).userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ code: API_ERROR_CODES.INVALID_TOKEN });
  }
}

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.format() });
    return;
  }
  try {
    const result = await authService.register(parsed.data);
    res.status(201).json(result.auth);
  } catch (error) {
    const code = error instanceof Error ? error.message : "REGISTER_FAILED";
    res.status(400).json({ code });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.format() });
    return;
  }
  try {
    const result = await authService.login(parsed.data);
    res.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "LOGIN_FAILED";
    res.status(401).json({ code });
  }
});

authRouter.post("/google", async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.format() });
    return;
  }
  try {
    const result = await authService.loginWithGoogle(parsed.data);
    res.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "GOOGLE_LOGIN_FAILED";
    res.status(401).json({ code });
  }
});

authRouter.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "REFRESH_TOKEN_MISSING" });
    return;
  }
  try {
    const result = await authService.refresh(parsed.data);
    res.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "REFRESH_FAILED";
    res.status(401).json({ code });
  }
});

authRouter.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.format() });
    return;
  }
  try {
    const result = await authService.requestPasswordReset(parsed.data);
    res.json(result);
  } catch {
    res.json({ ok: true });
  }
});

authRouter.post("/reset-password", passwordResetLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.format() });
    return;
  }
  try {
    const result = await authService.resetPassword(parsed.data);
    res.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "RESET_FAILED";
    res.status(400).json({ code });
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as Request & { userId: string }).userId;
    const profile = await authService.getProfile(userId);
    res.json(profile);
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROFILE_FETCH_FAILED";
    res.status(400).json({ code });
  }
});

authRouter.patch("/profile", requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.format() });
    return;
  }
  try {
    const userId = (req as Request & { userId: string }).userId;
    const updated = await authService.updateProfile(userId, parsed.data);
    res.json(updated);
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROFILE_UPDATE_FAILED";
    res.status(400).json({ code });
  }
});
