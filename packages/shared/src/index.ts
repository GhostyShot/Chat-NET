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

export type ChannelType = "DIRECT" | "GROUP";
export type ChannelMemberRole = "OWNER" | "ADMIN" | "MEMBER";

export interface ChannelUserSummary {
  id: string;
  username?: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface ChannelMembershipSummary {
  role: ChannelMemberRole;
  user: ChannelUserSummary;
}

export interface ChannelItem {
  id: string;
  type: ChannelType;
  name: string | null;
  updatedAt: string;
  memberships?: ChannelMembershipSummary[];
}

export interface MessageItem {
  id: string;
  channelId?: string;
  content: string;
  createdAt: string;
  sender: ChannelUserSummary;
}

export interface PresenceItem {
  userId: string;
  online: boolean;
  lastSeenAt: number | null;
}

export interface ChannelMemberItem {
  userId: string;
  channelId: string;
  role: ChannelMemberRole;
  createdAt: string;
  user: ChannelUserSummary & {
    username: string;
  };
}

export interface ProfileItem {
  id: string;
  email: string;
  username: string;
  userCode: string;
  userHandle: string;
  displayName: string;
  avatarUrl?: string | null;
  verifiedEmail: boolean;
  provider: AuthProvider;
}

export interface PlatformSettingsItem {
  uploadsEnabled: boolean;
  canManage: boolean;
}

export interface AuthEnvelope {
  auth: AuthResponse;
}

export interface OkResponse {
  ok: boolean;
}

export interface MessageListResponse {
  items: MessageItem[];
}

export interface DeletedMessageResponse {
  id: string;
  deleted: boolean;
}

export interface ReadReceiptResponse {
  readAt: string;
}

export interface UploadedFileResponse {
  url: string;
  filename: string;
}

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  code?: string;
  errorCode?: string;
  details?: unknown;
}