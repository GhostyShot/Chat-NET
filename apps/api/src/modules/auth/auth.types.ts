export interface StoredUser {
  id: string;
  email: string;
  username: string;
  userCode: string;
  displayName: string;
  avatarUrl?: string;
  provider: "google" | "password";
  verifiedEmail: boolean;
  passwordHash?: string;
  // Custom status
  statusEmoji?: string;
  statusText?: string;
  statusExpiresAt?: Date;
}

export interface StoredEmailToken {
  token: string;
  userId: string;
  type: "VERIFY" | "RESET";
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  username?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GoogleLoginInput {
  idToken: string;
  displayName?: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetInput {
  token: string;
  newPassword: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  username?: string;
  statusEmoji?: string;
  statusText?: string;
  statusExpiresAt?: string | null;
}
