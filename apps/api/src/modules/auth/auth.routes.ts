import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  forgotPasswordSchema,
  googleSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema
} from "./auth.validators.js";
import { authService } from "./auth.service.js";

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

function withErrorBoundary<T>(fn: () => Promise<T>, res: any) {
  fn()
    .then((data) => res.json(data))
    .catch((error: Error) => {
      const message = error.message || "UNEXPECTED_ERROR";
      const isGoogleTokenError = message.startsWith("INVALID_GOOGLE_TOKEN");
      const status =
        message === "EMAIL_EXISTS" ||
        message === "INVALID_CREDENTIALS" ||
        isGoogleTokenError ||
        message === "INVALID_TOKEN"
          ? 400
          : 500;
      res.status(status).json({ error: message });
    });
}

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  return withErrorBoundary(() => authService.register(parsed.data), res);
});

authRouter.post("/login", loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  return withErrorBoundary(() => authService.login(parsed.data), res);
});

authRouter.post("/google", loginLimiter, async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  return withErrorBoundary(() => authService.loginWithGoogle(parsed.data), res);
});

authRouter.post("/forgot-password", resetLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  return withErrorBoundary(() => authService.requestPasswordReset(parsed.data), res);
});

authRouter.post("/reset-password", resetLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  return withErrorBoundary(() => authService.resetPassword(parsed.data), res);
});

authRouter.post("/verify-email", async (req, res) => {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  return withErrorBoundary(() => authService.verifyEmail(parsed.data), res);
});