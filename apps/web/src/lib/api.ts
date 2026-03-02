import type {
  AuthResponse,
  ChannelItem,
  ChannelMemberItem,
  MessageItem,
  PlatformSettingsItem,
  PresenceItem,
  ProfileItem
} from "@chatnet/shared";

export type {
  ChannelItem,
  ChannelMemberItem,
  MessageItem,
  PlatformSettingsItem,
  PresenceItem,
  ProfileItem
} from "@chatnet/shared";

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
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

function jsonHeaders() {
  return { "Content-Type": "application/json" };
}

function authHeaders(accessToken: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`
  };
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

function extractErrorMessage(payload: unknown, fallbackError: string): string {
  if (!payload || typeof payload !== "object") {
    return fallbackError;
  }
  const candidate = payload as { error?: unknown; message?: unknown };
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
  const candidate = payload as { code?: unknown; errorCode?: unknown };
  if (typeof candidate.code === "string" && candidate.code.trim()) {
    return candidate.code;
  }
  if (typeof candidate.errorCode === "string" && candidate.errorCode.trim()) {
    return candidate.errorCode;
  }
  return undefined;
}

async function requestJson<T>(
  path: string,
  init: RequestInit,
  options: { fallbackError: string; timeoutMs?: number; retry?: boolean }
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const shouldRetry = options.retry ?? method === "GET";
  const maxAttempts = shouldRetry ? 2 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_URL}${path}`, {
        ...init,
        signal: controller.signal
      });

      const payload = await parseResponsePayload(response);
      if (!response.ok) {
        throw new ApiError(extractErrorMessage(payload, options.fallbackError), {
          status: response.status,
          code: extractErrorCode(payload)
        });
      }

      return payload as T;
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
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
          code: options.fallbackError
        });
      }

      if (error instanceof TypeError) {
        throw new ApiError("Netzwerkfehler. Bitte Verbindung prüfen.", {
          isNetwork: true,
          code: options.fallbackError
        });
      }

      throw error;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw new ApiError(options.fallbackError, { code: options.fallbackError });
}

export async function register(email: string, password: string, displayName: string): Promise<AuthResponse> {
  const payload = await requestJson<{ auth: AuthResponse }>(
    "/auth/register",
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ email, password, displayName })
    },
    { fallbackError: "REGISTER_FAILED", retry: false }
  );
  return payload.auth;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return requestJson<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ email, password })
    },
    { fallbackError: "LOGIN_FAILED", retry: false }
  );
}

export async function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return requestJson<AuthResponse>(
    "/auth/google",
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ idToken })
    },
    { fallbackError: "GOOGLE_LOGIN_FAILED", retry: false }
  );
}

export async function forgotPassword(email: string): Promise<void> {
  await requestJson<unknown>(
    "/auth/forgot-password",
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ email })
    },
    { fallbackError: "FORGOT_PASSWORD_FAILED", retry: false }
  );
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await requestJson<unknown>(
    "/auth/reset-password",
    {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ token, newPassword })
    },
    { fallbackError: "RESET_PASSWORD_FAILED", retry: false }
  );
}

export async function getProfile(accessToken: string): Promise<ProfileItem> {
  return requestJson<ProfileItem>(
    "/auth/me",
    {
      method: "GET",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "PROFILE_FAILED" }
  );
}

export async function updateProfile(
  accessToken: string,
  data: { displayName?: string; username?: string }
): Promise<ProfileItem> {
  return requestJson<ProfileItem>(
    "/auth/profile",
    {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify(data)
    },
    { fallbackError: "PROFILE_UPDATE_FAILED", retry: false }
  );
}

export async function listChannels(accessToken: string): Promise<ChannelItem[]> {
  return requestJson<ChannelItem[]>(
    "/chat/channels",
    {
      method: "GET",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "CHANNELS_FAILED" }
  );
}

export async function createGroupChannel(
  accessToken: string,
  name: string,
  memberIds: string[]
): Promise<ChannelItem> {
  return requestJson<ChannelItem>(
    "/chat/channels",
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ type: "group", name, memberIds })
    },
    { fallbackError: "CREATE_CHANNEL_FAILED", retry: false }
  );
}

export async function deleteGroupChannel(accessToken: string, channelId: string): Promise<void> {
  await requestJson<unknown>(
    `/chat/channels/${channelId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "DELETE_CHANNEL_FAILED", retry: false }
  );
}

export async function createDirectByUsername(accessToken: string, username: string): Promise<ChannelItem> {
  return requestJson<ChannelItem>(
    "/chat/direct/by-username",
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ username })
    },
    { fallbackError: "CREATE_DIRECT_FAILED", retry: false }
  );
}

export async function addGroupMemberByUsername(accessToken: string, channelId: string, username: string): Promise<void> {
  await requestJson<unknown>(
    `/chat/channels/${channelId}/members/by-username`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ username })
    },
    { fallbackError: "ADD_MEMBER_FAILED", retry: false }
  );
}

export async function listChannelMembers(accessToken: string, channelId: string): Promise<ChannelMemberItem[]> {
  return requestJson<ChannelMemberItem[]>(
    `/chat/channels/${channelId}/members`,
    {
      method: "GET",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "MEMBERS_FAILED" }
  );
}

export async function updateChannelMemberRole(
  accessToken: string,
  channelId: string,
  targetUserId: string,
  role: "admin" | "member"
): Promise<ChannelMemberItem> {
  return requestJson<ChannelMemberItem>(
    `/chat/channels/${channelId}/members/${targetUserId}/role`,
    {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ role })
    },
    { fallbackError: "UPDATE_MEMBER_ROLE_FAILED", retry: false }
  );
}

export async function removeChannelMember(accessToken: string, channelId: string, targetUserId: string): Promise<void> {
  await requestJson<unknown>(
    `/chat/channels/${channelId}/members/${targetUserId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "REMOVE_MEMBER_FAILED", retry: false }
  );
}

export async function transferChannelOwnership(
  accessToken: string,
  channelId: string,
  targetUserId: string
): Promise<void> {
  await requestJson<unknown>(
    `/chat/channels/${channelId}/ownership/transfer`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ targetUserId })
    },
    { fallbackError: "TRANSFER_OWNERSHIP_FAILED", retry: false }
  );
}

export async function leaveChannel(accessToken: string, channelId: string): Promise<void> {
  await requestJson<unknown>(
    `/chat/channels/${channelId}/members/me`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "LEAVE_CHANNEL_FAILED", retry: false }
  );
}

export async function listMessages(accessToken: string, channelId: string): Promise<MessageItem[]> {
  const payload = await requestJson<{ items?: MessageItem[] }>(
    `/chat/channels/${channelId}/messages?limit=50`,
    {
      method: "GET",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "MESSAGES_FAILED" }
  );
  return payload.items ?? [];
}

export async function sendMessage(accessToken: string, channelId: string, content: string): Promise<MessageItem> {
  return requestJson<MessageItem>(
    `/chat/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ content })
    },
    { fallbackError: "SEND_MESSAGE_FAILED", retry: false }
  );
}

export async function updateMessage(
  accessToken: string,
  channelId: string,
  messageId: string,
  content: string
): Promise<MessageItem> {
  return requestJson<MessageItem>(
    `/chat/channels/${channelId}/messages/${messageId}`,
    {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ content })
    },
    { fallbackError: "UPDATE_MESSAGE_FAILED", retry: false }
  );
}

export async function deleteMessage(accessToken: string, channelId: string, messageId: string): Promise<void> {
  await requestJson<unknown>(
    `/chat/channels/${channelId}/messages/${messageId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "DELETE_MESSAGE_FAILED", retry: false }
  );
}

export async function uploadFile(accessToken: string, file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);

  return requestJson<{ url: string; filename: string }>(
    "/chat/upload",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: formData
    },
    { fallbackError: "UPLOAD_FAILED", retry: false }
  );
}

export async function markRead(accessToken: string, channelId: string, messageId: string): Promise<void> {
  await requestJson<unknown>(
    `/chat/channels/${channelId}/read-receipts`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ messageId })
    },
    { fallbackError: "READ_RECEIPT_FAILED", retry: false }
  );
}

export async function searchMessages(
  accessToken: string,
  query: string,
  channelId?: string
): Promise<MessageItem[]> {
  const search = new URLSearchParams({ query, limit: "20", ...(channelId ? { channelId } : {}) });
  return requestJson<MessageItem[]>(
    `/chat/search?${search.toString()}`,
    {
      method: "GET",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "SEARCH_FAILED" }
  );
}

export async function getPresence(accessToken: string, userIds: string[]): Promise<PresenceItem[]> {
  return requestJson<PresenceItem[]>(
    `/chat/presence?userIds=${encodeURIComponent(userIds.join(","))}`,
    {
      method: "GET",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "PRESENCE_FAILED" }
  );
}

export async function blockUser(accessToken: string, targetUserId: string): Promise<void> {
  await requestJson<unknown>(
    `/chat/block/${targetUserId}`,
    {
      method: "POST",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "BLOCK_FAILED", retry: false }
  );
}

export async function unblockUser(accessToken: string, targetUserId: string): Promise<void> {
  await requestJson<unknown>(
    `/chat/block/${targetUserId}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "UNBLOCK_FAILED", retry: false }
  );
}

export async function getPlatformSettings(accessToken: string): Promise<PlatformSettingsItem> {
  return requestJson<PlatformSettingsItem>(
    "/chat/platform-settings",
    {
      method: "GET",
      headers: authHeaders(accessToken)
    },
    { fallbackError: "PLATFORM_SETTINGS_FAILED" }
  );
}

export async function setPlatformUploadsEnabled(accessToken: string, uploadsEnabled: boolean): Promise<void> {
  await requestJson<unknown>(
    "/chat/platform-settings/uploads",
    {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify({ uploadsEnabled })
    },
    { fallbackError: "UPDATE_PLATFORM_UPLOADS_FAILED", retry: false }
  );
}