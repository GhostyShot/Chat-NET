import type {
  GoogleLoginInput,
  LoginInput,
  PasswordResetInput,
  PasswordResetRequest,
  RegisterInput,
  VerifyEmailInput
} from "./auth.types.js";
import { authStore } from "./auth.store.js";
import { buildAuthResponse, hashPassword, verifyPassword } from "./auth.security.js";
import { verifyGoogleIdToken } from "./auth.google.js";

const TOKEN_TTL_MS = 1000 * 60 * 30;

export class AuthService {
  async register(input: RegisterInput) {
    const existing = await authStore.getByEmail(input.email);
    if (existing) {
      throw new Error("EMAIL_EXISTS");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authStore.createUser({
      email: input.email,
      displayName: input.displayName,
      provider: "password",
      verifiedEmail: false,
      passwordHash
    });

    const verifyToken = await authStore.createEmailToken({
      userId: user.id,
      type: "verify",
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS)
    });

    return {
      auth: buildAuthResponse(user),
      verifyToken
    };
  }

  async login(input: LoginInput) {
    const user = await authStore.getByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    return buildAuthResponse(user);
  }

  async loginWithGoogle(input: GoogleLoginInput) {
    const googleProfile = await verifyGoogleIdToken(input.idToken);
    let user = await authStore.getByEmail(googleProfile.email);
    if (!user) {
      user = await authStore.createUser({
        email: googleProfile.email,
        displayName: input.displayName ?? googleProfile.displayName,
        provider: "google",
        verifiedEmail: googleProfile.verifiedEmail
      });
    } else {
      user.displayName = input.displayName ?? user.displayName;
      user.avatarUrl = googleProfile.avatarUrl ?? user.avatarUrl;
      user.verifiedEmail = true;
      await authStore.updateUser(user);
    }

    return buildAuthResponse(user);
  }

  async requestPasswordReset(input: PasswordResetRequest) {
    const user = await authStore.getByEmail(input.email);
    if (!user || !user.passwordHash) {
      return { resetToken: "hidden" };
    }

    const resetToken = await authStore.createEmailToken({
      userId: user.id,
      type: "reset",
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS)
    });

    return { resetToken };
  }

  async resetPassword(input: PasswordResetInput) {
    const tokenRecord = await authStore.consumeEmailToken(input.token, "reset");
    if (!tokenRecord) {
      throw new Error("INVALID_TOKEN");
    }

    const user = await authStore.getById(tokenRecord.userId);
    if (!user) {
      throw new Error("INVALID_TOKEN");
    }

    user.passwordHash = await hashPassword(input.newPassword);
    await authStore.updateUser(user);
    return { ok: true };
  }

  async verifyEmail(input: VerifyEmailInput) {
    const tokenRecord = await authStore.consumeEmailToken(input.token, "verify");
    if (!tokenRecord) {
      throw new Error("INVALID_TOKEN");
    }

    const user = await authStore.getById(tokenRecord.userId);
    if (!user) {
      throw new Error("INVALID_TOKEN");
    }

    user.verifiedEmail = true;
    await authStore.updateUser(user);
    return { ok: true };
  }
}

export const authService = new AuthService();