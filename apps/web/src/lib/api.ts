import type { AuthResponse } from "@chatnet/shared";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export interface ChannelItem {
  id: string;
  type: "DIRECT" | "GROUP";
  name: string | null;
  updatedAt: string;
  memberships?: Array<{
    role: "OWNER" | "ADMIN" | "MEMBER";
    user: {
      id: string;
      username?: string;
      displayName: string;
    };
  }>;
}

export interface MessageItem {
  id: string;
  channelId?: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    username?: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

export interface PresenceItem {
  userId: string;
  online: boolean;
  lastSeenAt: number | null;
}

export interface ChannelMemberItem {
  userId: string;
  channelId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
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
  provider: "google" | "password";
}

export interface PlatformSettingsItem {
  uploadsEnabled: boolean;
  canManage: boolean;
}

function authHeaders(accessToken: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`
  };
}

export async function register(email: string, password: string, displayName: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "REGISTER_FAILED");
  }
  return payload.auth as AuthResponse;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "LOGIN_FAILED");
  }
  return payload as AuthResponse;
}

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "GOOGLE_LOGIN_FAILED");
  }
  return payload as AuthResponse;
}

export async function forgotPassword(email: string): Promise<void> {
  const response = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "FORGOT_PASSWORD_FAILED");
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const response = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "RESET_PASSWORD_FAILED");
  }
}

export async function getProfile(accessToken: string): Promise<ProfileItem> {
  const response = await fetch(`${API_URL}/auth/me`, {
    method: "GET",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "PROFILE_FAILED");
  }
  return payload as ProfileItem;
}

export async function updateProfile(
  accessToken: string,
  data: { displayName?: string; username?: string }
): Promise<ProfileItem> {
  const response = await fetch(`${API_URL}/auth/profile`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify(data)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "PROFILE_UPDATE_FAILED");
  }
  return payload as ProfileItem;
}

export async function listChannels(accessToken: string): Promise<ChannelItem[]> {
  const response = await fetch(`${API_URL}/chat/channels`, {
    method: "GET",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "CHANNELS_FAILED");
  }
  return payload as ChannelItem[];
}

export async function createGroupChannel(
  accessToken: string,
  name: string,
  memberIds: string[]
): Promise<ChannelItem> {
  const response = await fetch(`${API_URL}/chat/channels`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ type: "group", name, memberIds })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "CREATE_CHANNEL_FAILED");
  }
  return payload as ChannelItem;
}

export async function deleteGroupChannel(accessToken: string, channelId: string): Promise<void> {
  const response = await fetch(`${API_URL}/chat/channels/${channelId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "DELETE_CHANNEL_FAILED");
  }
}

export async function createDirectByUsername(accessToken: string, username: string): Promise<ChannelItem> {
  const response = await fetch(`${API_URL}/chat/direct/by-username`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ username })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "CREATE_DIRECT_FAILED");
  }
  return payload as ChannelItem;
}

export async function addGroupMemberByUsername(accessToken: string, channelId: string, username: string): Promise<void> {
  const response = await fetch(`${API_URL}/chat/channels/${channelId}/members/by-username`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ username })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "ADD_MEMBER_FAILED");
  }
}

export async function listChannelMembers(accessToken: string, channelId: string): Promise<ChannelMemberItem[]> {
  const response = await fetch(`${API_URL}/chat/channels/${channelId}/members`, {
    method: "GET",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "MEMBERS_FAILED");
  }
  return payload as ChannelMemberItem[];
}

export async function updateChannelMemberRole(
  accessToken: string,
  channelId: string,
  targetUserId: string,
  role: "admin" | "member"
): Promise<ChannelMemberItem> {
  const response = await fetch(`${API_URL}/chat/channels/${channelId}/members/${targetUserId}/role`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ role })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "UPDATE_MEMBER_ROLE_FAILED");
  }
  return payload as ChannelMemberItem;
}

export async function removeChannelMember(accessToken: string, channelId: string, targetUserId: string): Promise<void> {
  const response = await fetch(`${API_URL}/chat/channels/${channelId}/members/${targetUserId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "REMOVE_MEMBER_FAILED");
  }
}

export async function transferChannelOwnership(
  accessToken: string,
  channelId: string,
  targetUserId: string
): Promise<void> {
  const response = await fetch(`${API_URL}/chat/channels/${channelId}/ownership/transfer`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ targetUserId })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "TRANSFER_OWNERSHIP_FAILED");
  }
}

export async function leaveChannel(accessToken: string, channelId: string): Promise<void> {
  const response = await fetch(`${API_URL}/chat/channels/${channelId}/members/me`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "LEAVE_CHANNEL_FAILED");
  }
}

export async function listMessages(accessToken: string, channelId: string): Promise<MessageItem[]> {
  const response = await fetch(`${API_URL}/chat/channels/${channelId}/messages?limit=50`, {
    method: "GET",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "MESSAGES_FAILED");
  }
  return (payload.items ?? []) as MessageItem[];
}

export async function sendMessage(accessToken: string, channelId: string, content: string): Promise<MessageItem> {
  const response = await fetch(`${API_URL}/chat/channels/${channelId}/messages`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ content })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "SEND_MESSAGE_FAILED");
  }
  return payload as MessageItem;
}

export async function updateMessage(
  accessToken: string,
  channelId: string,
  messageId: string,
  content: string
): Promise<MessageItem> {
  const response = await fetch(`${API_URL}/chat/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ content })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "UPDATE_MESSAGE_FAILED");
  }
  return payload as MessageItem;
}

export async function deleteMessage(accessToken: string, channelId: string, messageId: string): Promise<void> {
  const response = await fetch(`${API_URL}/chat/channels/${channelId}/messages/${messageId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "DELETE_MESSAGE_FAILED");
  }
}

export async function uploadFile(accessToken: string, file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/chat/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    body: formData
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "UPLOAD_FAILED");
  }

  return payload as { url: string; filename: string };
}

export async function markRead(accessToken: string, channelId: string, messageId: string): Promise<void> {
  const response = await fetch(`${API_URL}/chat/channels/${channelId}/read-receipts`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ messageId })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "READ_RECEIPT_FAILED");
  }
}

export async function searchMessages(
  accessToken: string,
  query: string,
  channelId?: string
): Promise<MessageItem[]> {
  const search = new URLSearchParams({ query, limit: "20", ...(channelId ? { channelId } : {}) });
  const response = await fetch(`${API_URL}/chat/search?${search.toString()}`, {
    method: "GET",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "SEARCH_FAILED");
  }
  return payload as MessageItem[];
}

export async function getPresence(accessToken: string, userIds: string[]): Promise<PresenceItem[]> {
  const response = await fetch(`${API_URL}/chat/presence?userIds=${encodeURIComponent(userIds.join(","))}`, {
    method: "GET",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "PRESENCE_FAILED");
  }
  return payload as PresenceItem[];
}

export async function blockUser(accessToken: string, targetUserId: string): Promise<void> {
  const response = await fetch(`${API_URL}/chat/block/${targetUserId}`, {
    method: "POST",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "BLOCK_FAILED");
  }
}

export async function unblockUser(accessToken: string, targetUserId: string): Promise<void> {
  const response = await fetch(`${API_URL}/chat/block/${targetUserId}`, {
    method: "DELETE",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "UNBLOCK_FAILED");
  }
}

export async function getPlatformSettings(accessToken: string): Promise<PlatformSettingsItem> {
  const response = await fetch(`${API_URL}/chat/platform-settings`, {
    method: "GET",
    headers: authHeaders(accessToken)
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "PLATFORM_SETTINGS_FAILED");
  }
  return payload as PlatformSettingsItem;
}

export async function setPlatformUploadsEnabled(accessToken: string, uploadsEnabled: boolean): Promise<void> {
  const response = await fetch(`${API_URL}/chat/platform-settings/uploads`, {
    method: "PATCH",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ uploadsEnabled })
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "UPDATE_PLATFORM_UPLOADS_FAILED");
  }
}