import type {
  GoogleLoginInput, LoginInput, PasswordResetInput,
  PasswordResetRequest, RefreshInput, RegisterInput, UpdateProfileInput,
} from "./auth.types.js";
import { authStore } from "./auth.store.js";
import { buildAuthResponse, hashPassword, verifyPassword } from "./auth.security.js";
import { verifyGoogleIdToken } from "./auth.google.js";
import { sendPasswordResetEmail } from "./auth.mail.js";
import { API_ERROR_CODES } from "@chatnet/shared";
import jwt from "jsonwebtoken";
import { appConfig } from "../../config.js";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await authStore.getByEmail(input.email);
    if (existing) throw new Error(API_ERROR_CODES.EMAIL_EXISTS);
    const passwordHash = await hashPassword(input.password);
    const user = await authStore.createUser({
      email: input.email,
      displayName: input.displayName,
      username: input.username,
      provider: "password",
      verifiedEmail: false,
      passwordHash,
    });
    return { auth: buildAuthResponse(user) };
  }

  async login(input: LoginInput) {
    const user = await authStore.getByEmail(input.email);
    if (!user || !user.passwordHash) throw new Error(API_ERROR_CODES.INVALID_CREDENTIALS);
    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) throw new Error(API_ERROR_CODES.INVALID_CREDENTIALS);
    return buildAuthResponse(user);
  }

  async loginWithGoogle(input: GoogleLoginInput) {
    const googleProfile = await verifyGoogleIdToken(input.idToken);
    let user = await authStore.getByEmail(googleProfile.email);
    if (!user) {
      user = await authStore.createUser({
        email: googleProfile.email,
        displayName: input.displayName ?? googleProfile.displayName,
        username: undefined,
        provider: "google",
        verifiedEmail: googleProfile.verifiedEmail,
      });
    } else {
      user.displayName = input.displayName ?? user.displayName;
      user.avatarUrl = googleProfile.avatarUrl ?? user.avatarUrl;
      user.verifiedEmail = true;
      await authStore.updateUser(user);
    }
    return buildAuthResponse(user);
  }

  async refresh(input: RefreshInput) {
    let payload: { sub?: string; kind?: string };
    try {
      payload = jwt.verify(input.refreshToken, appConfig.jwtRefreshSecret) as { sub?: string; kind?: string };
    } catch {
      throw new Error(API_ERROR_CODES.INVALID_TOKEN);
    }
    if (!payload.sub || payload.kind !== "refresh") throw new Error(API_ERROR_CODES.INVALID_TOKEN);
    const user = await authStore.getById(payload.sub);
    if (!user) throw new Error(API_ERROR_CODES.INVALID_TOKEN);
    return buildAuthResponse(user);
  }

  async requestPasswordReset(input: PasswordResetRequest) {
    const user = await authStore.getByEmail(input.email);
    if (!user || !user.passwordHash) return { ok: true };
    const resetToken = await authStore.createEmailToken({
      userId: user.id,
      type: "reset",
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });
    const delivery = await sendPasswordResetEmail({ to: user.email, token: resetToken });
    if (!delivery.delivered) {
      console.warn(`[auth] Reset mail not delivered for ${user.email}. Link: ${delivery.resetUrl}`);
    }
    return { ok: true };
  }

  async resetPassword(input: PasswordResetInput) {
    const tokenRecord = await authStore.consumeEmailToken(input.token, "reset");
    if (!tokenRecord) throw new Error(API_ERROR_CODES.INVALID_TOKEN);
    const user = await authStore.getById(tokenRecord.userId);
    if (!user) throw new Error(API_ERROR_CODES.INVALID_TOKEN);
    user.passwordHash = await hashPassword(input.newPassword);
    await authStore.updateUser(user);
    return { ok: true };
  }

  async getProfile(userId: string) {
    const user = await authStore.getById(userId);
    if (!user) throw new Error(API_ERROR_CODES.INVALID_TOKEN);
    return {
      id: user.id, email: user.email, username: user.username,
      userCode: user.userCode, userHandle: `${user.username}#${user.userCode}`,
      displayName: user.displayName, avatarUrl: user.avatarUrl,
      provider: user.provider, verifiedEmail: user.verifiedEmail,
      statusEmoji: user.statusEmoji ?? null,
      statusText: user.statusText ?? null,
      statusExpiresAt: user.statusExpiresAt?.toISOString() ?? null,
    };
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await authStore.getById(userId);
    if (!user) throw new Error(API_ERROR_CODES.INVALID_TOKEN);

    if (input.displayName !== undefined) user.displayName = input.displayName;
    if (input.username !== undefined) {
      const normalized = authStore.normalizeUsername(input.username);
      if (normalized.length < 3) throw new Error(API_ERROR_CODES.USERNAME_INVALID_FORMAT);
      const taken = await authStore.isUsernameTaken(normalized, user.id);
      if (taken) throw new Error(API_ERROR_CODES.USERNAME_TAKEN);
      user.username = normalized;
    }
    if (input.statusEmoji !== undefined) user.statusEmoji = input.statusEmoji || undefined;
    if (input.statusText !== undefined) user.statusText = input.statusText || undefined;
    if (input.statusExpiresAt !== undefined) {
      user.statusExpiresAt = input.statusExpiresAt ? new Date(input.statusExpiresAt) : undefined;
    }

    const updated = await authStore.updateUser(user);
    return buildAuthResponse(updated).user;
  }
}

export const authService = new AuthService();
