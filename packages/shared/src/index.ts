export type AuthProvider = "google" | "password";

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  userCode: string;
  userHandle: string;
  displayName: string;
  avatarUrl?: string;
  verifiedEmail: boolean;
  provider: AuthProvider;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}