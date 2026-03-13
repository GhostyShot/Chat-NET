import { Router } from "express";
import { authService } from "./auth.service.js";
import { verifyGoogleIdToken } from "./auth.google.js";
import { sendPasswordResetEmail } from "./auth.mail.js";
import { buildAuthResponse } from "./auth.security.js";
import {
  registerSchema, loginSchema, googleSchema, refreshSchema,
  forgotPasswordSchema, resetPasswordSchema, updateProfileSchema,
} from "./auth.validators.js";
import { authLimiter, passwordResetLimiter } from "../../lib/rateLimiter.js";
import { appConfig } from "../../config.js";
import { authStore } from "./auth.store.js";
import { API_ERROR_CODES } from "@chatnet/shared";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import multer from "multer";

export const authRouter = Router();
authRouter.use(authLimiter);

type AuthRequest = Request & { userId?: string };

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ code: API_ERROR_CODES.AUTH_REQUIRED }); return;
  }
  try {
    const payload = jwt.verify(header.slice(7), appConfig.jwtAccessSecret) as { sub?: string };
    if (!payload.sub) throw new Error();
    (req as AuthRequest).userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ code: API_ERROR_CODES.INVALID_TOKEN });
  }
}

// Avatar upload — memory storage, 200KB limit
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: appConfig.avatarMaxBytes },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only images allowed"));
    } else {
      cb(null, true);
    }
  },
});

// ── Register
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.format() }); return; }
  try {
    const result = await authService.register(parsed.data);
    res.status(201).json(result.auth);
  } catch (error) {
    res.status(400).json({ code: error instanceof Error ? error.message : "REGISTER_FAILED" });
  }
});

// ── Login
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR", errors: parsed.error.format() }); return; }
  try {
    res.json(await authService.login(parsed.data));
  } catch (error) {
    res.status(401).json({ code: error instanceof Error ? error.message : "LOGIN_FAILED" });
  }
});

// ── Google
authRouter.post("/google", async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR" }); return; }
  try {
    res.json(await authService.loginWithGoogle(parsed.data));
  } catch (error) {
    res.status(401).json({ code: error instanceof Error ? error.message : "GOOGLE_LOGIN_FAILED" });
  }
});

// ── Refresh
authRouter.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "REFRESH_TOKEN_MISSING" }); return; }
  try {
    res.json(await authService.refresh(parsed.data));
  } catch (error) {
    res.status(401).json({ code: error instanceof Error ? error.message : "REFRESH_FAILED" });
  }
});

// ── Forgot password
authRouter.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR" }); return; }
  try {
    await authService.requestPasswordReset(parsed.data);
  } catch {
    // swallow — always return ok to prevent email enumeration
  }
  res.json({ ok: true });
});

// ── Reset password
authRouter.post("/reset-password", passwordResetLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR" }); return; }
  try {
    res.json(await authService.resetPassword(parsed.data));
  } catch (error) {
    res.status(400).json({ code: error instanceof Error ? error.message : "RESET_FAILED" });
  }
});

// ── Get profile
authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    res.json(await authService.getProfile((req as AuthRequest).userId!));
  } catch (error) {
    res.status(400).json({ code: error instanceof Error ? error.message : "PROFILE_FETCH_FAILED" });
  }
});

// ── Update profile (displayName, username, status)
authRouter.patch("/profile", requireAuth, async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ code: "VALIDATION_ERROR" }); return; }
  try {
    res.json(await authService.updateProfile((req as AuthRequest).userId!, parsed.data));
  } catch (error) {
    res.status(400).json({ code: error instanceof Error ? error.message : "PROFILE_UPDATE_FAILED" });
  }
});

// ── Upload avatar
// Strategy: Cloudinary if configured, otherwise store as base64 data-URI in DB.
// Max 200KB → fits comfortably in Neon without eating storage budget.
authRouter.post("/avatar", requireAuth, avatarUpload.single("avatar"), async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const file = req.file;
  if (!file) { res.status(400).json({ code: "FILE_REQUIRED" }); return; }

  try {
    let avatarUrl: string;

    if (appConfig.cloudinaryCloud && appConfig.cloudinaryKey && appConfig.cloudinarySecret) {
      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", new Blob([file.buffer], { type: file.mimetype }));
      formData.append("upload_preset", "chat_net_avatars");
      formData.append("public_id", `avatars/${userId}`);
      formData.append("overwrite", "true");
      formData.append("transformation", "w_200,h_200,c_fill,g_face,r_max,q_auto");

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${appConfig.cloudinaryCloud}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!cloudRes.ok) throw new Error("CLOUDINARY_UPLOAD_FAILED");
      const cloudData = (await cloudRes.json()) as { secure_url: string };
      avatarUrl = cloudData.secure_url;
    } else {
      // Fallback: base64 data-URI stored in DB
      // Small images only — 200KB limit enforced by multer
      avatarUrl = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
    }

    const user = await authStore.getById(userId);
    if (!user) throw new Error(API_ERROR_CODES.INVALID_TOKEN);
    user.avatarUrl = avatarUrl;
    await authStore.updateUser(user);

    res.json({ avatarUrl });
  } catch (error) {
    console.error("[avatar]", error);
    res.status(400).json({ code: error instanceof Error ? error.message : "AVATAR_UPLOAD_FAILED" });
  }
});

// ── Search users (for DM modal)
authRouter.get("/users/search", requireAuth, async (req, res) => {
  const q = (req.query.q as string ?? "").trim().toLowerCase();
  if (!q || q.length < 2) { res.json([]); return; }
  try {
    const results = await authStore.searchUsers(q);
    res.json(results.map(u => ({
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl ?? null,
    })));
  } catch {
    res.json([]);
  }
});
