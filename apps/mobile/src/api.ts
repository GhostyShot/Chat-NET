import type {
  ApiErrorPayload,
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

export type { ChannelItem, ChannelMemberItem, MessageItem, PresenceItem } from "@chatnet/shared";

const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
export const API_URL = runtimeEnv?.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";
const DEFAULT_TIMEOUT_MS = 12_000;

export class ApiError extends Error {
  status: number;
  code?: string;
  isNetwork: boolean;
  isTimeout: boolean;

  constructor(message: string, options: { status?: number; code?: string; isNetwork?: boolean; isTimeout?: boolean } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status ?? 0;
    this.code = options.code;
    this.isNetwork = Boolean(options.isNetwork);
    this.isTimeout = Boolean(options.isTimeout);
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function extractErrorMessage(payload: unknown, fallbackError: string): string {
  if (!payload || typeof payload !== "object") {
    return fallbackError;
  }
  const candidate = payload as ApiErrorPayload;
  if (typeof candidate.error === "string" && candidate.error.trim()) {
    return candidate.error;
  }
  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message;
  }
  return fallbackError;
}

function extractErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const candidate = payload as ApiErrorPayload;
  if (typeof candidate.code === "string" && candidate.code.trim()) {
    return candidate.code;
  }
  if (typeof candidate.errorCode === "string" && candidate.errorCode.trim()) {
    return candidate.errorCode;
  }
  return undefined;
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text ? { error: text } : null;
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options?: { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown; accessToken?: string; timeoutMs?: number; retry?: boolean }
) {
  const method = options?.method ?? "POST";
  const shouldRetry = options?.retry ?? method === "GET";
  const maxAttempts = shouldRetry ? 2 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(options?.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {})
        },
        signal: controller.signal,
        ...(options?.body ? { body: JSON.stringify(options.body) } : {})
      });

      const payload = await parseResponsePayload(response);
      if (!response.ok) {
        throw new ApiError(extractErrorMessage(payload, "REQUEST_FAILED"), {
          status: response.status,
          code: extractErrorCode(payload)
        });
      }

      return payload as T;
    } catch (error) {
      const timedOut = isAbortError(error);
      const networkIssue = timedOut || error instanceof TypeError;
      const canRetry = attempt < maxAttempts - 1 && networkIssue;

      if (canRetry) {
        continue;
      }

      if (error instanceof ApiError) {
        throw error;
      }

      if (timedOut) {
        throw new ApiError("Anfrage hat zu lange gedauert. Bitte erneut versuchen.", {
          isNetwork: true,
          isTimeout: true,
          code: "REQUEST_TIMEOUT"
        });
      }

      if (error instanceof TypeError) {
        throw new ApiError("Netzwerkfehler. Bitte Verbindung prüfen.", {
          isNetwork: true,
          code: "REQUEST_NETWORK_ERROR"
        });
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new ApiError("REQUEST_FAILED", { code: "REQUEST_FAILED" });
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