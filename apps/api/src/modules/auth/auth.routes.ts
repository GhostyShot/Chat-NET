import { Router } from "express";
import { authService } from "./auth.service.js";
import { googleVerify } from "./auth.google.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "./auth.mail.js";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.validators.js";
import { requireAuth } from "./auth.security.js";
import { authLimiter, passwordResetLimiter } from "../../lib/rateLimiter.js";

export const authRouter = Router();

// Apply strict rate limits to all auth routes
authRouter.use(authLimiter);

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.errors });
    return;
  }

  try {
    const { user, tokens } = await authService.register(parsed.data);
    const { passwordHash: _, ...safeUser } = user as typeof user & { passwordHash?: string };

    if (user.email && !user.verifiedEmail) {
      void sendVerificationEmail(
        user.email,
        user.displayName,
        await authService.createEmailToken(user.id, "VERIFY")
      );
    }

    res.status(201).json({ user: safeUser, tokens });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REGISTER_FAILED";
    res.status(400).json({ code });
  }
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.errors });
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
  const { credential } = req.body as { credential?: string };
  if (!credential || typeof credential !== "string") {
    res.status(400).json({ code: "GOOGLE_CREDENTIAL_MISSING" });
    return;
  }

  try {
    const googleUser = await googleVerify(credential);
    const result = await authService.loginWithGoogle(googleUser);
    res.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "GOOGLE_LOGIN_FAILED";
    res.status(401).json({ code });
  }
});

authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken || typeof refreshToken !== "string") {
    res.status(400).json({ code: "REFRESH_TOKEN_MISSING" });
    return;
  }

  try {
    const result = await authService.refresh(refreshToken);
    res.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "REFRESH_FAILED";
    res.status(401).json({ code });
  }
});

authRouter.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.errors });
    return;
  }

  try {
    const user = await authService.findUserByEmail(parsed.data.email);
    if (user) {
      const token = await authService.createEmailToken(user.id, "RESET");
      void sendPasswordResetEmail(user.email, user.displayName, token);
    }
    // Always return 200 to prevent email enumeration
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

authRouter.post("/reset-password", passwordResetLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.errors });
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

authRouter.get("/profile", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const profile = await authService.getProfile(userId);
    res.json(profile);
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROFILE_FETCH_FAILED";
    res.status(400).json({ code });
  }
});

authRouter.patch("/profile", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { displayName, username } = req.body as { displayName?: string; username?: string };
    const updated = await authService.updateProfile(userId, { displayName, username });
    res.json(updated);
  } catch (error) {
    const code = error instanceof Error ? error.message : "PROFILE_UPDATE_FAILED";
    res.status(400).json({ code });
  }
});
