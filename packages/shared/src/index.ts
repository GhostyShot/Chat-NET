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
export type ChannelPostingPolicy = "ALL_MEMBERS" | "ADMINS_ONLY" | "OWNER_ONLY";

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
  isSystem?: boolean;
  systemKey?: string | null;
  postingPolicy?: ChannelPostingPolicy;
  updatedAt: string;
  memberships?: ChannelMembershipSummary[];
}

export interface MessageItem {
  id: string;
  channelId?: string;
  content: string;
  createdAt: string;
  replyTo?: {
    id: string;
    content: string;
    sender: ChannelUserSummary;
  } | null;
  sender: ChannelUserSummary;
}

export interface PollOptionItem {
  id: string;
  label: string;
  voteCount: number;
}

export interface PollItem {
  id: string;
  channelId: string;
  question: string;
  isClosed: boolean;
  createdAt: string;
  creator: ChannelUserSummary;
  options: PollOptionItem[];
  votedOptionId: string | null;
  totalVotes: number;
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

export interface ChannelSummaryRequest {
  days?: number;
  limit?: number;
}

export interface ChannelSummaryResponse {
  summary: string;
  source: "ai" | "fallback";
  messageCount: number;
  days: number;
  limit: number;
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

export const API_ERROR_CODES = {
  UNEXPECTED_ERROR: "UNEXPECTED_ERROR",
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_TOKEN: "INVALID_TOKEN",
  INVALID_BODY: "INVALID_BODY",
  INVALID_QUERY: "INVALID_QUERY",
  INVALID_PATH_PARAMS: "INVALID_PATH_PARAMS",
  INVALID_CHANNEL_ID: "INVALID_CHANNEL_ID",
  INVALID_TARGET_USER_ID: "INVALID_TARGET_USER_ID",
  FILE_REQUIRED: "FILE_REQUIRED",
  PUBLIC_BASE_URL_MISSING: "PUBLIC_BASE_URL_MISSING",
  FORBIDDEN_OWNER_ONLY: "FORBIDDEN_OWNER_ONLY",
  UPLOADS_DISABLED: "UPLOADS_DISABLED",
  EMAIL_EXISTS: "EMAIL_EXISTS",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  USERNAME_TAKEN: "USERNAME_TAKEN",
  USERNAME_INVALID_FORMAT: "USERNAME_INVALID_FORMAT",
  INVALID_GOOGLE_TOKEN: "INVALID_GOOGLE_TOKEN",
  INVALID_GOOGLE_TOKEN_EMAIL: "INVALID_GOOGLE_TOKEN_EMAIL",
  INVALID_GOOGLE_TOKEN_UNVERIFIED_EMAIL: "INVALID_GOOGLE_TOKEN_UNVERIFIED_EMAIL",
  INVALID_GOOGLE_TOKEN_AUDIENCE: "INVALID_GOOGLE_TOKEN_AUDIENCE",
  DIRECT_REQUIRES_TWO_MEMBERS: "DIRECT_REQUIRES_TWO_MEMBERS",
  GROUP_NAME_REQUIRED: "GROUP_NAME_REQUIRED",
  MESSAGE_NOT_FOUND: "MESSAGE_NOT_FOUND",
  INVALID_BLOCK_TARGET: "INVALID_BLOCK_TARGET",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  GROUP_ONLY: "GROUP_ONLY",
  MEMBER_EXISTS: "MEMBER_EXISTS",
  INVALID_TARGET_USER: "INVALID_TARGET_USER",
  OWNER_TRANSFER_REQUIRED: "OWNER_TRANSFER_REQUIRED",
  FORBIDDEN_CHANNEL: "FORBIDDEN_CHANNEL",
  USER_BLOCKED: "USER_BLOCKED",
  FORBIDDEN_MESSAGE: "FORBIDDEN_MESSAGE",
  AI_SUMMARY_FAILED: "AI_SUMMARY_FAILED",
  POLL_NOT_FOUND: "POLL_NOT_FOUND",
  POLL_OPTION_INVALID: "POLL_OPTION_INVALID",
  POLL_CLOSED: "POLL_CLOSED",
  SYSTEM_CHANNEL_PROTECTED: "SYSTEM_CHANNEL_PROTECTED"
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export type RealtimeJoinRoomPayload = string;

export interface RealtimeTypingPayload {
  roomId: string;
  userId: string;
}

export interface RealtimeReadReceiptEvent {
  roomId: string;
  messageId: string;
  userId: string;
}

export interface RealtimeVoiceJoinPayload {
  roomId: string;
}

export interface RealtimeVoiceLeavePayload {
  roomId: string;
}

export interface RealtimeVoiceEndPayload {
  roomId: string;
}

export interface RealtimeVoiceOfferPayload {
  roomId: string;
  targetUserId: string;
  sdp: string;
}

export interface RealtimeVoiceAnswerPayload {
  roomId: string;
  targetUserId: string;
  sdp: string;
}

export interface RealtimeVoiceIceCandidatePayload {
  roomId: string;
  targetUserId: string;
  candidate: {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  };
}

export interface RealtimeVoiceParticipantsPayload {
  roomId: string;
  userIds: string[];
}

export interface RealtimeVoiceParticipantPayload {
  roomId: string;
  userId: string;
}

export interface RealtimeVoiceOfferEvent {
  roomId: string;
  fromUserId: string;
  targetUserId: string;
  sdp: string;
}

export interface RealtimeVoiceAnswerEvent {
  roomId: string;
  fromUserId: string;
  targetUserId: string;
  sdp: string;
}

export interface RealtimeVoiceIceCandidateEvent {
  roomId: string;
  fromUserId: string;
  targetUserId: string;
  candidate: {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  };
}

export interface RealtimeVoiceEndedEvent {
  roomId: string;
  endedByUserId: string;
}

export interface RealtimeServerToClientEvents {
  new_message: (message: MessageItem) => void;
  typing: (payload: RealtimeTypingPayload) => void;
  presence_update: (payload: PresenceItem) => void;
  message_updated: (message: MessageItem) => void;
  message_deleted: (payload: DeletedMessageResponse) => void;
  read_receipt: (payload: RealtimeReadReceiptEvent) => void;
  vc_participants: (payload: RealtimeVoiceParticipantsPayload) => void;
  vc_participant_joined: (payload: RealtimeVoiceParticipantPayload) => void;
  vc_participant_left: (payload: RealtimeVoiceParticipantPayload) => void;
  vc_offer: (payload: RealtimeVoiceOfferEvent) => void;
  vc_answer: (payload: RealtimeVoiceAnswerEvent) => void;
  vc_ice_candidate: (payload: RealtimeVoiceIceCandidateEvent) => void;
  vc_ended: (payload: RealtimeVoiceEndedEvent) => void;
}

export interface RealtimeClientToServerEvents {
  join_room: (roomId: RealtimeJoinRoomPayload) => void;
  typing: (payload: RealtimeTypingPayload) => void;
  read_receipt: (payload: RealtimeReadReceiptEvent) => void;
  vc_join: (payload: RealtimeVoiceJoinPayload) => void;
  vc_leave: (payload: RealtimeVoiceLeavePayload) => void;
  vc_end: (payload: RealtimeVoiceEndPayload) => void;
  vc_offer: (payload: RealtimeVoiceOfferPayload) => void;
  vc_answer: (payload: RealtimeVoiceAnswerPayload) => void;
  vc_ice_candidate: (payload: RealtimeVoiceIceCandidatePayload) => void;
}

export const REALTIME_EVENTS = {
  NEW_MESSAGE: "new_message",
  TYPING: "typing",
  PRESENCE_UPDATE: "presence_update",
  MESSAGE_UPDATED: "message_updated",
  MESSAGE_DELETED: "message_deleted",
  READ_RECEIPT: "read_receipt",
  JOIN_ROOM: "join_room",
  VC_JOIN: "vc_join",
  VC_LEAVE: "vc_leave",
  VC_END: "vc_end",
  VC_PARTICIPANTS: "vc_participants",
  VC_PARTICIPANT_JOINED: "vc_participant_joined",
  VC_PARTICIPANT_LEFT: "vc_participant_left",
  VC_OFFER: "vc_offer",
  VC_ANSWER: "vc_answer",
  VC_ICE_CANDIDATE: "vc_ice_candidate",
  VC_ENDED: "vc_ended"
} as const;

export { ApiRequestError, requestJson, type ApiRequestErrorOptions, type RequestJsonOptions } from "./http.js";