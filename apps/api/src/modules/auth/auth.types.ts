import type { AuthProvider, UserProfile } from "@chatnet/shared";

export interface StoredUser extends UserProfile {
  passwordHash?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleLoginInput {
  idToken: string;
  displayName?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetInput {
  token: string;
  newPassword: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface EmailTokenRecord {
  userId: string;
  type: "verify" | "reset";
  expiresAt: number;
}

export interface CreateEmailTokenInput {
  userId: string;
  type: "verify" | "reset";
  expiresAt: Date;
}

export interface CreateUserInput {
  email: string;
  displayName: string;
  provider: AuthProvider;
  verifiedEmail: boolean;
  passwordHash?: string;
}