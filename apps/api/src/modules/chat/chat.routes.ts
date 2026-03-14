import { Router } from "express";
import type { Response, NextFunction } from "express";
import multer from "multer";
import { requireAuth, type AuthenticatedRequest } from "./chat.auth.js";
import { chatService } from "./chat.service.js";
import {
  channelSummarySchema, createPollSchema, createChannelSchema,
  usernameTargetSchema, pagingQuerySchema, presenceQuerySchema,
  readReceiptSchema, searchQuerySchema, sendMessageSchema,
  transferOwnershipSchema, updateMemberRoleSchema, updateMessageSchema, votePollSchema
} from "./chat.validators.js";
import { getRealtimeServer } from "../../realtime.state.js";
import { getBulkPresence } from "../../realtime.presence.js";
import { appConfig } from "../../config.js";
import { prisma } from "../../lib/prisma.js";
import { platformSettingsStore } from "./chat.platform-settings.js";
import { API_ERROR_CODES, type MessageItem } from "@chatnet/shared";
import { REALTIME_EVENTS } from "@chatnet/shared";
import { sendError, withErrorBoundary } from "../../lib/http-errors.js";
import { uploadChatFile } from "../../lib/cloudinary.js";

function singleParam(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export const chatRouter = Router();

const CHAT_BAD_REQUEST_ERRORS = [
  API_ERROR_CODES.DIRECT_REQUIRES_TWO_MEMBERS, API_ERROR_CODES.GROUP_NAME_REQUIRED,
  API_ERROR_CODES.MESSAGE_NOT_FOUND, API_ERROR_CODES.INVALID_BLOCK_TARGET,
  API_ERROR_CODES.USER_NOT_FOUND, API_ERROR_CODES.GROUP_ONLY,
  API_ERROR_CODES.MEMBER_EXISTS, API_ERROR_CODES.INVALID_TARGET_USER,
  API_ERROR_CODES.OWNER_TRANSFER_REQUIRED, API_ERROR_CODES.POLL_NOT_FOUND,
  API_ERROR_CODES.POLL_OPTION_INVALID, API_ERROR_CODES.POLL_CLOSED,
] as const;

const CHAT_FORBIDDEN_ERRORS = [
  API_ERROR_CODES.FORBIDDEN_CHANNEL, API_ERROR_CODES.USER_BLOCKED, API_ERROR_CODES.SYSTEM_CHANNEL_PROTECTED,
] as const;

function toRealtimeMessage(msg: {
  id: string; channelId: string; content: string; createdAt: Date | string;
  sender: { id: string; username?: string; displayName: string; avatarUrl?: string | null };
}): MessageItem {
  return { ...msg, createdAt: typeof msg.createdAt === "string" ? msg.createdAt : msg.createdAt.toISOString() };
}

chatRouter.use(requireAuth);

// Per-type file size limits (bytes)
const FILE_LIMITS = { image: 8*1024*1024, video: 40*1024*1024, audio: 10*1024*1024, default: 8*1024*1024 };

// Memory storage — no disk writes on Render
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ALLOWED = [
      "image/jpeg","image/png","image/gif","image/webp","image/svg+xml",
      "video/mp4","video/webm","video/quicktime",
      "audio/mpeg","audio/ogg","audio/webm","audio/mp4","audio/wav",
      "application/pdf","application/zip","application/x-zip-compressed",
      "text/plain","text/csv",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];
    if (!ALLOWED.includes(file.mimetype)) { cb(new Error("FILE_TYPE_NOT_ALLOWED")); return; }
    cb(null, true);
  },
});

async function isPlatformOwner(userId: string): Promise<boolean> {
  if (appConfig.platformOwnerUserId && userId === appConfig.platformOwnerUserId) return true;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  return user?.username?.toLowerCase() === "paul_fmp";
}

async function requirePlatformOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
    if (!(await isPlatformOwner(userId))) return res.status(403).json({ error: API_ERROR_CODES.FORBIDDEN_OWNER_ONLY });
    return next();
  } catch { return res.status(500).json({ error: API_ERROR_CODES.UNEXPECTED_ERROR }); }
}

async function requireUploadsEnabled(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const settings = await platformSettingsStore.getSettings();
    if (!settings.uploadsEnabled) return res.status(403).json({ error: API_ERROR_CODES.UPLOADS_DISABLED });
    return next();
  } catch { return res.status(500).json({ error: API_ERROR_CODES.UNEXPECTED_ERROR }); }
}

// Platform settings
chatRouter.get("/platform-settings", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
    const settings = await platformSettingsStore.getSettings();
    return res.json({ ...settings, canManage: await isPlatformOwner(userId) });
  } catch { return res.status(500).json({ error: API_ERROR_CODES.UNEXPECTED_ERROR }); }
});
chatRouter.patch("/platform-settings/uploads", requirePlatformOwner, async (req: AuthenticatedRequest, res) => {
  const value = req.body?.uploadsEnabled;
  if (typeof value !== "boolean") return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY });
  return res.json(await platformSettingsStore.setUploadsEnabled(value));
});

// Channels
chatRouter.get("/channels", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId;
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  return withErrorBoundary(() => chatService.listChannels(uid), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.post("/channels", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId;
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  const p = createChannelSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: p.error.issues });
  return withErrorBoundary(() => chatService.createChannel({ ownerId: uid, type: p.data.type, name: p.data.name, memberIds: p.data.memberIds }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.delete("/channels/:channelId", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  return withErrorBoundary(() => chatService.deleteGroupChannel({ channelId: cid, requesterId: uid }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.post("/direct/by-username", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId;
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  const p = usernameTargetSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: p.error.issues });
  return withErrorBoundary(() => chatService.createDirectChannelByUsername({ ownerId: uid, username: p.data.username }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.post("/channels/:channelId/members/by-username", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  const p = usernameTargetSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: p.error.issues });
  return withErrorBoundary(() => chatService.addGroupMemberByUsername({ channelId: cid, requesterId: uid, username: p.data.username }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.get("/channels/:channelId/members", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  return withErrorBoundary(() => chatService.listChannelMembers({ channelId: cid, requesterId: uid }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.patch("/channels/:channelId/members/:targetUserId/role", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId); const tid = singleParam(req.params.targetUserId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid || !tid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_PATH_PARAMS });
  const p = updateMemberRoleSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: p.error.issues });
  return withErrorBoundary(() => chatService.updateChannelMemberRole({ channelId: cid, requesterId: uid, targetUserId: tid, role: p.data.role }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.delete("/channels/:channelId/members/me", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  return withErrorBoundary(() => chatService.leaveChannel({ channelId: cid, requesterId: uid }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.delete("/channels/:channelId/members/:targetUserId", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId); const tid = singleParam(req.params.targetUserId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid || !tid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_PATH_PARAMS });
  return withErrorBoundary(() => chatService.removeChannelMember({ channelId: cid, requesterId: uid, targetUserId: tid }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.post("/channels/:channelId/ownership/transfer", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  const p = transferOwnershipSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: p.error.issues });
  return withErrorBoundary(() => chatService.transferChannelOwnership({ channelId: cid, requesterId: uid, targetUserId: p.data.targetUserId }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});

// Messages
chatRouter.get("/channels/:channelId/messages", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  const q = pagingQuerySchema.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_QUERY, details: q.error.issues });
  return withErrorBoundary(() => chatService.listMessages({ channelId: cid, userId: uid, cursor: q.data.cursor, limit: q.data.limit ?? 30 }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.post("/channels/:channelId/summary", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  const p = channelSummarySchema.safeParse(req.body ?? {});
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: p.error.issues });
  return withErrorBoundary(() => chatService.summarizeChannel({ channelId: cid, userId: uid, days: p.data.days ?? 7, limit: p.data.limit ?? 150 }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.post("/channels/:channelId/messages", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  const p = sendMessageSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: p.error.issues });
  try {
    const sent = await chatService.sendMessage({ channelId: cid, userId: uid, content: p.data.content, replyToMessageId: p.data.replyToMessageId });
    getRealtimeServer()?.to(cid).emit(REALTIME_EVENTS.NEW_MESSAGE, toRealtimeMessage(sent));
    return res.json(sent);
  } catch (error) {
    return sendError(res, error, { forbidden: [API_ERROR_CODES.FORBIDDEN_CHANNEL, API_ERROR_CODES.USER_BLOCKED], badRequest: CHAT_BAD_REQUEST_ERRORS });
  }
});
chatRouter.patch("/channels/:channelId/messages/:messageId", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId); const mid = singleParam(req.params.messageId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid || !mid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_PATH_PARAMS });
  const p = updateMessageSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: p.error.issues });
  try {
    const updated = await chatService.updateMessage({ userId: uid, channelId: cid, messageId: mid, content: p.data.content });
    getRealtimeServer()?.to(cid).emit(REALTIME_EVENTS.MESSAGE_UPDATED, toRealtimeMessage(updated));
    return res.json(updated);
  } catch (error) {
    return sendError(res, error, { forbidden: [API_ERROR_CODES.FORBIDDEN_CHANNEL, API_ERROR_CODES.FORBIDDEN_MESSAGE], badRequest: CHAT_BAD_REQUEST_ERRORS });
  }
});
chatRouter.delete("/channels/:channelId/messages/:messageId", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId); const mid = singleParam(req.params.messageId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid || !mid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_PATH_PARAMS });
  try {
    const deleted = await chatService.deleteMessage({ userId: uid, channelId: cid, messageId: mid });
    getRealtimeServer()?.to(cid).emit(REALTIME_EVENTS.MESSAGE_DELETED, deleted);
    return res.json(deleted);
  } catch (error) {
    return sendError(res, error, { forbidden: [API_ERROR_CODES.FORBIDDEN_CHANNEL, API_ERROR_CODES.FORBIDDEN_MESSAGE], badRequest: CHAT_BAD_REQUEST_ERRORS });
  }
});
chatRouter.post("/channels/:channelId/read-receipts", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  const p = readReceiptSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: p.error.issues });
  try {
    const receipt = await chatService.markAsRead({ channelId: cid, userId: uid, messageId: p.data.messageId });
    getRealtimeServer()?.to(cid).emit(REALTIME_EVENTS.READ_RECEIPT, { roomId: cid, messageId: p.data.messageId, userId: uid });
    return res.json(receipt);
  } catch (error) {
    return sendError(res, error, { forbidden: [API_ERROR_CODES.FORBIDDEN_CHANNEL], badRequest: CHAT_BAD_REQUEST_ERRORS });
  }
});

// Polls
chatRouter.get("/channels/:channelId/polls", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  return withErrorBoundary(() => chatService.listPolls({ channelId: cid, userId: uid }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.post("/channels/:channelId/polls", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  const p = createPollSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: p.error.issues });
  return withErrorBoundary(() => chatService.createPoll({ channelId: cid, userId: uid, question: p.data.question, options: p.data.options }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.post("/channels/:channelId/polls/:pollId/vote", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const cid = singleParam(req.params.channelId); const pid = singleParam(req.params.pollId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!cid || !pid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_PATH_PARAMS });
  const p = votePollSchema.safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: p.error.issues });
  return withErrorBoundary(() => chatService.votePoll({ channelId: cid, pollId: pid, optionId: p.data.optionId, userId: uid }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});

// Presence & search
chatRouter.get("/presence", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId;
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  const p = presenceQuerySchema.safeParse(req.query);
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_QUERY, details: p.error.issues });
  return res.json(getBulkPresence(p.data.userIds.split(",").map((i) => i.trim()).filter(Boolean)));
});
chatRouter.get("/search", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId;
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  const p = searchQuerySchema.safeParse(req.query);
  if (!p.success) return res.status(400).json({ error: API_ERROR_CODES.INVALID_QUERY, details: p.error.issues });
  return withErrorBoundary(() => chatService.searchMessages({ userId: uid, query: p.data.query, channelId: p.data.channelId, limit: p.data.limit ?? 20 }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});

// Blocking
chatRouter.get("/blocks", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId;
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  return withErrorBoundary(() => chatService.listBlockedUsers(uid), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.post("/block/:targetUserId", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const tid = singleParam(req.params.targetUserId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!tid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_TARGET_USER_ID });
  return withErrorBoundary(() => chatService.blockUser({ blockerId: uid, blockedId: tid }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});
chatRouter.delete("/block/:targetUserId", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId; const tid = singleParam(req.params.targetUserId);
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!tid) return res.status(400).json({ error: API_ERROR_CODES.INVALID_TARGET_USER_ID });
  return withErrorBoundary(() => chatService.unblockUser({ blockerId: uid, blockedId: tid }), res, { badRequest: CHAT_BAD_REQUEST_ERRORS, forbidden: CHAT_FORBIDDEN_ERRORS });
});

// File upload — Cloudinary only, no disk writes
chatRouter.post("/upload", requireUploadsEnabled, upload.single("file"), async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId;
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  if (!req.file) return res.status(400).json({ error: API_ERROR_CODES.FILE_REQUIRED });

  const file = req.file;
  const maxSize = file.mimetype.startsWith("image/") ? FILE_LIMITS.image
    : file.mimetype.startsWith("video/") ? FILE_LIMITS.video
    : file.mimetype.startsWith("audio/") ? FILE_LIMITS.audio
    : FILE_LIMITS.default;

  if (file.size > maxSize) {
    const mb = Math.round(maxSize / 1024 / 1024);
    return res.status(413).json({ error: "FILE_TOO_LARGE", detail: `Max ${mb}MB für diesen Dateityp.` });
  }

  try {
    const fileUrl = await uploadChatFile(file.buffer, file.mimetype, file.originalname);
    return res.json({ url: fileUrl, filename: file.originalname, size: file.size, mimeType: file.mimetype });
  } catch (error) {
    console.error("[upload]", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : "UPLOAD_FAILED" });
  }
});

// Link preview
chatRouter.get("/link-preview", async (req: AuthenticatedRequest, res) => {
  const uid = req.user?.userId;
  if (!uid) return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  const url = singleParam(req.query.url as string);
  if (!url || !url.startsWith("http")) return res.status(400).json({ error: "INVALID_URL" });
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const r = await fetch(url, { signal: controller.signal, headers: { "User-Agent": "ChatNetBot/1.0" } }).finally(() => clearTimeout(timeout));
    if (!r.ok) return res.json(null);
    const html = await r.text();
    const getMeta = (name: string) => {
      const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))
             ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`, "i"));
      return m?.[1]?.trim() ?? null;
    };
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return res.json({
      title: getMeta("og:title") ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null,
      description: getMeta("og:description") ?? getMeta("description"),
      image: getMeta("og:image"),
      domain,
    });
  } catch { return res.json(null); }
});
