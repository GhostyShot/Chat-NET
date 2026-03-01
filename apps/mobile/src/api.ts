import type { AuthResponse } from "@chatnet/shared";

const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
export const API_URL = runtimeEnv?.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

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
      avatarUrl?: string | null;
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

async function request<T>(path: string, options?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; accessToken?: string }) {
  const response = await fetch(`${API_URL}${path}`, {
    method: options?.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options?.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {})
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "REQUEST_FAILED");
  }
  return payload as T;
}

export const api = {
  register: async (email: string, password: string, displayName: string): Promise<AuthResponse> => {
    const payload = await request<{ auth: AuthResponse }>("/auth/register", {
      body: { email, password, displayName }
    });
    return payload.auth;
  },
  login: (email: string, password: string) => request<AuthResponse>("/auth/login", { body: { email, password } }),
  google: (idToken: string) => request<AuthResponse>("/auth/google", { body: { idToken } }),
  forgot: (email: string) => request<{ resetToken: string }>("/auth/forgot-password", { body: { email } }),
  reset: (token: string, newPassword: string) => request<{ ok: boolean }>("/auth/reset-password", { body: { token, newPassword } }),
  verify: (token: string) => request<{ ok: boolean }>("/auth/verify-email", { body: { token } }),
  listChannels: (accessToken: string) =>
    request<ChannelItem[]>("/chat/channels", {
      method: "GET",
      accessToken
    }),
  createGroupChannel: (accessToken: string, name: string) =>
    request<ChannelItem>("/chat/channels", {
      method: "POST",
      accessToken,
      body: { type: "group", name, memberIds: [] }
    }),
  createDirectByUsername: (accessToken: string, username: string) =>
    request<ChannelItem>("/chat/direct/by-username", {
      method: "POST",
      accessToken,
      body: { username }
    }),
  addGroupMemberByUsername: (accessToken: string, channelId: string, username: string) =>
    request(`/chat/channels/${channelId}/members/by-username`, {
      method: "POST",
      accessToken,
      body: { username }
    }),
  listChannelMembers: (accessToken: string, channelId: string) =>
    request<ChannelMemberItem[]>(`/chat/channels/${channelId}/members`, {
      method: "GET",
      accessToken
    }),
  updateChannelMemberRole: (accessToken: string, channelId: string, targetUserId: string, role: "admin" | "member") =>
    request<ChannelMemberItem>(`/chat/channels/${channelId}/members/${targetUserId}/role`, {
      method: "PATCH",
      accessToken,
      body: { role }
    }),
  removeChannelMember: (accessToken: string, channelId: string, targetUserId: string) =>
    request<{ ok: boolean }>(`/chat/channels/${channelId}/members/${targetUserId}`, {
      method: "DELETE",
      accessToken
    }),
  listMessages: (accessToken: string, channelId: string) =>
    request<{ items: MessageItem[] }>(`/chat/channels/${channelId}/messages?limit=50`, {
      method: "GET",
      accessToken
    }),
  sendMessage: (accessToken: string, channelId: string, content: string) =>
    request<MessageItem>(`/chat/channels/${channelId}/messages`, {
      method: "POST",
      accessToken,
      body: { content }
    }),
  updateMessage: (accessToken: string, channelId: string, messageId: string, content: string) =>
    request<MessageItem>(`/chat/channels/${channelId}/messages/${messageId}`, {
      method: "PATCH",
      accessToken,
      body: { content }
    }),
  deleteMessage: (accessToken: string, channelId: string, messageId: string) =>
    request<{ id: string; deleted: boolean }>(`/chat/channels/${channelId}/messages/${messageId}`, {
      method: "DELETE",
      accessToken
    }),
  markRead: (accessToken: string, channelId: string, messageId: string) =>
    request<{ readAt: string }>(`/chat/channels/${channelId}/read-receipts`, {
      method: "POST",
      accessToken,
      body: { messageId }
    }),
  searchMessages: (accessToken: string, query: string, channelId?: string) =>
    request<MessageItem[]>(
      `/chat/search?${new URLSearchParams({ query, limit: "20", ...(channelId ? { channelId } : {}) }).toString()}`,
      {
        method: "GET",
        accessToken
      }
    ),
  getPresence: (accessToken: string, userIds: string[]) =>
    request<PresenceItem[]>(`/chat/presence?userIds=${encodeURIComponent(userIds.join(","))}`, {
      method: "GET",
      accessToken
    }),
  blockUser: (accessToken: string, targetUserId: string) =>
    request(`/chat/block/${targetUserId}`, {
      method: "POST",
      accessToken
    })
};