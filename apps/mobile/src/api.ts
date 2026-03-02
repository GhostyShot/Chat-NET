import type {
  AuthEnvelope,
  AuthResponse,
  ChannelItem,
  ChannelMemberItem,
  DeletedMessageResponse,
  MessageItem,
  MessageListResponse,
  OkResponse,
  PresenceItem,
  ReadReceiptResponse
} from "@chatnet/shared";
import { ApiRequestError, requestJson as sharedRequestJson } from "@chatnet/shared";

export type { ChannelItem, ChannelMemberItem, MessageItem, PresenceItem } from "@chatnet/shared";

const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
export const API_URL = runtimeEnv?.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends ApiRequestError {}

async function request<T>(
  path: string,
  options?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; accessToken?: string; timeoutMs?: number; retry?: boolean }
) {
  const method = options?.method ?? "POST";

  try {
    return await sharedRequestJson<T>(
      API_URL,
      path,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(options?.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
        },
        ...(options?.body ? { body: JSON.stringify(options.body) } : {})
      },
      {
        fallbackError: "REQUEST_FAILED",
        timeoutMs: options?.timeoutMs,
        retry: options?.retry,
        timeoutMessage: "Anfrage hat zu lange gedauert. Bitte erneut versuchen.",
        networkMessage: "Netzwerkfehler. Bitte Verbindung prüfen.",
        requestCode: "REQUEST_FAILED"
      }
    );
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw new ApiError(error.message, {
        status: error.status,
        code: error.code,
        isNetwork: error.isNetwork,
        isTimeout: error.isTimeout
      });
    }
    throw error;
  }
}

export const api = {
  register: async (email: string, password: string, displayName: string): Promise<AuthResponse> => {
    const payload = await request<AuthEnvelope>("/auth/register", {
      body: { email, password, displayName }
    });
    return payload.auth;
  },
  login: (email: string, password: string) => request<AuthResponse>("/auth/login", { body: { email, password } }),
  google: (idToken: string) => request<AuthResponse>("/auth/google", { body: { idToken } }),
  forgot: (email: string) => request<OkResponse>("/auth/forgot-password", { body: { email } }),
  reset: (token: string, newPassword: string) => request<OkResponse>("/auth/reset-password", { body: { token, newPassword } }),
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
  deleteGroupChannel: (accessToken: string, channelId: string) =>
    request<OkResponse>(`/chat/channels/${channelId}`, {
      method: "DELETE",
      accessToken
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
    request<OkResponse>(`/chat/channels/${channelId}/members/${targetUserId}`, {
      method: "DELETE",
      accessToken
    }),
  transferChannelOwnership: (accessToken: string, channelId: string, targetUserId: string) =>
    request<OkResponse>(`/chat/channels/${channelId}/ownership/transfer`, {
      method: "POST",
      accessToken,
      body: { targetUserId }
    }),
  leaveChannel: (accessToken: string, channelId: string) =>
    request<OkResponse>(`/chat/channels/${channelId}/members/me`, {
      method: "DELETE",
      accessToken
    }),
  listMessages: (accessToken: string, channelId: string) =>
    request<MessageListResponse>(`/chat/channels/${channelId}/messages?limit=50`, {
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
    request<DeletedMessageResponse>(`/chat/channels/${channelId}/messages/${messageId}`, {
      method: "DELETE",
      accessToken
    }),
  markRead: (accessToken: string, channelId: string, messageId: string) =>
    request<ReadReceiptResponse>(`/chat/channels/${channelId}/read-receipts`, {
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