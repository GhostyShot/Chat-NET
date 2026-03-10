import { Router } from "express";
import type { Response } from "express";
import type { NextFunction } from "express";
import fs from "node:fs";
import multer from "multer";
import { requireAuth, type AuthenticatedRequest } from "./chat.auth.js";
import { chatService } from "./chat.service.js";
import {
  channelSummarySchema,
  createPollSchema,
  createChannelSchema,
  usernameTargetSchema,
  pagingQuerySchema,
  presenceQuerySchema,
  readReceiptSchema,
  searchQuerySchema,
  sendMessageSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
  updateMessageSchema,
  votePollSchema
} from "./chat.validators.js";
import { getRealtimeServer } from "../../realtime.state.js";
import { getBulkPresence } from "../../realtime.presence.js";
import { appConfig } from "../../config.js";
import { prisma } from "../../lib/prisma.js";
import { platformSettingsStore } from "./chat.platform-settings.js";
import { API_ERROR_CODES, type MessageItem } from "@chatnet/shared";
import { REALTIME_EVENTS } from "@chatnet/shared";
import { sendError, withErrorBoundary } from "../../lib/http-errors.js";

function singleParam(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

export const chatRouter = Router();

const CHAT_BAD_REQUEST_ERRORS = [
  API_ERROR_CODES.DIRECT_REQUIRES_TWO_MEMBERS,
  API_ERROR_CODES.GROUP_NAME_REQUIRED,
  API_ERROR_CODES.MESSAGE_NOT_FOUND,
  API_ERROR_CODES.INVALID_BLOCK_TARGET,
  API_ERROR_CODES.USER_NOT_FOUND,
  API_ERROR_CODES.GROUP_ONLY,
  API_ERROR_CODES.MEMBER_EXISTS,
  API_ERROR_CODES.INVALID_TARGET_USER,
  API_ERROR_CODES.OWNER_TRANSFER_REQUIRED,
  API_ERROR_CODES.POLL_NOT_FOUND,
  API_ERROR_CODES.POLL_OPTION_INVALID,
  API_ERROR_CODES.POLL_CLOSED
] as const;

const CHAT_FORBIDDEN_ERRORS = [API_ERROR_CODES.FORBIDDEN_CHANNEL, API_ERROR_CODES.USER_BLOCKED, API_ERROR_CODES.SYSTEM_CHANNEL_PROTECTED] as const;

function toRealtimeMessage(message: {
  id: string;
  channelId: string;
  content: string;
  createdAt: Date | string;
  sender: {
    id: string;
    username?: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}): MessageItem {
  return {
    ...message,
    createdAt: typeof message.createdAt === "string" ? message.createdAt : message.createdAt.toISOString()
  };
}

chatRouter.use(requireAuth);

const uploadDir = appConfig.uploadDir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    callback(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }
});

async function isPlatformOwner(userId: string): Promise<boolean> {
  if (appConfig.platformOwnerUserId && userId === appConfig.platformOwnerUserId) {
    return true;
  }
  // Hard-lock: require BOTH username AND userCode so nobody else can gain owner access
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true, userCode: true } });
  return user?.username?.toLowerCase() === "paul_fmp" && user?.userCode?.toUpperCase() === "E75582";
}

async function requirePlatformOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
    }
    if (!(await isPlatformOwner(userId))) {
      return res.status(403).json({ error: API_ERROR_CODES.FORBIDDEN_OWNER_ONLY });
    }
    return next();
  } catch {
    return res.status(500).json({ error: API_ERROR_CODES.UNEXPECTED_ERROR });
  }
}

async function requireUploadsEnabled(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const settings = await platformSettingsStore.getSettings();
    if (!settings.uploadsEnabled) {
      return res.status(403).json({ error: API_ERROR_CODES.UPLOADS_DISABLED });
    }
    return next();
  } catch {
    return res.status(500).json({ error: API_ERROR_CODES.UNEXPECTED_ERROR });
  }
}

chatRouter.get("/platform-settings", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
    }

    const settings = await platformSettingsStore.getSettings();
    const canManage = await isPlatformOwner(userId);
    return res.json({ ...settings, canManage });
  } catch {
    return res.status(500).json({ error: API_ERROR_CODES.UNEXPECTED_ERROR });
  }
});

chatRouter.patch("/platform-settings/uploads", requirePlatformOwner, async (req: AuthenticatedRequest, res) => {
  const value = req.body?.uploadsEnabled;
  if (typeof value !== "boolean") {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY });
  }
  const updated = await platformSettingsStore.setUploadsEnabled(value);
  return res.json(updated);
});

chatRouter.get("/channels", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  return withErrorBoundary(() => chatService.listChannels(userId), res, {
    badRequest: CHAT_BAD_REQUEST_ERRORS,
    forbidden: CHAT_FORBIDDEN_ERRORS
  });
});

chatRouter.post("/channels", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const parsed = createChannelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.createChannel({
        ownerId: userId,
        type: parsed.data.type,
        name: parsed.data.name,
        memberIds: parsed.data.memberIds
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.delete("/channels/:channelId", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  }

  return withErrorBoundary(
    () =>
      chatService.deleteGroupChannel({
        channelId,
        requesterId: userId
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.post("/direct/by-username", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const parsed = usernameTargetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.createDirectChannelByUsername({
        ownerId: userId,
        username: parsed.data.username
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.post("/channels/:channelId/members/by-username", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  }

  const parsed = usernameTargetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.addGroupMemberByUsername({
        channelId,
        requesterId: userId,
        username: parsed.data.username
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.get("/channels/:channelId/members", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  }

  return withErrorBoundary(
    () =>
      chatService.listChannelMembers({
        channelId,
        requesterId: userId
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.patch("/channels/:channelId/members/:targetUserId/role", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  const targetUserId = singleParam(req.params.targetUserId);
  if (!channelId || !targetUserId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_PATH_PARAMS });
  }

  const parsed = updateMemberRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.updateChannelMemberRole({
        channelId,
        requesterId: userId,
        targetUserId,
        role: parsed.data.role
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.delete("/channels/:channelId/members/me", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  }

  return withErrorBoundary(
    () =>
      chatService.leaveChannel({
        channelId,
        requesterId: userId
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.delete("/channels/:channelId/members/:targetUserId", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  const targetUserId = singleParam(req.params.targetUserId);
  if (!channelId || !targetUserId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_PATH_PARAMS });
  }

  return withErrorBoundary(
    () =>
      chatService.removeChannelMember({
        channelId,
        requesterId: userId,
        targetUserId
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.post("/channels/:channelId/ownership/transfer", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  }

  const parsed = transferOwnershipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.transferChannelOwnership({
        channelId,
        requesterId: userId,
        targetUserId: parsed.data.targetUserId
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.get("/channels/:channelId/messages", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  }

  const parsedQuery = pagingQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_QUERY, details: parsedQuery.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.listMessages({
        channelId,
        userId,
        cursor: parsedQuery.data.cursor,
        limit: parsedQuery.data.limit ?? 30
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.post("/channels/:channelId/summary", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  }

  const parsed = channelSummarySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.summarizeChannel({
        channelId,
        userId,
        days: parsed.data.days ?? 7,
        limit: parsed.data.limit ?? 150
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.get("/channels/:channelId/polls", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  }

  return withErrorBoundary(() => chatService.listPolls({ channelId, userId }), res, {
    badRequest: CHAT_BAD_REQUEST_ERRORS,
    forbidden: CHAT_FORBIDDEN_ERRORS
  });
});

chatRouter.post("/channels/:channelId/polls", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  }

  const parsed = createPollSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.createPoll({
        channelId,
        userId,
        question: parsed.data.question,
        options: parsed.data.options
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.post("/channels/:channelId/polls/:pollId/vote", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  const pollId = singleParam(req.params.pollId);
  if (!channelId || !pollId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_PATH_PARAMS });
  }

  const parsed = votePollSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.votePoll({
        channelId,
        pollId,
        optionId: parsed.data.optionId,
        userId
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.post("/channels/:channelId/messages", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  }

  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  try {
    const sent = await chatService.sendMessage({
      channelId,
      userId,
      content: parsed.data.content,
      replyToMessageId: parsed.data.replyToMessageId
    });

    const io = getRealtimeServer();
    io?.to(channelId).emit(REALTIME_EVENTS.NEW_MESSAGE, toRealtimeMessage(sent));

    return res.json(sent);
  } catch (error) {
    return sendError(res, error, {
      forbidden: [API_ERROR_CODES.FORBIDDEN_CHANNEL, API_ERROR_CODES.USER_BLOCKED],
      badRequest: CHAT_BAD_REQUEST_ERRORS
    });
  }
});

chatRouter.patch("/channels/:channelId/messages/:messageId", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  const messageId = singleParam(req.params.messageId);
  if (!channelId || !messageId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_PATH_PARAMS });
  }

  const parsed = updateMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  try {
    const updated = await chatService.updateMessage({
      userId,
      channelId,
      messageId,
      content: parsed.data.content
    });

    const io = getRealtimeServer();
    io?.to(channelId).emit(REALTIME_EVENTS.MESSAGE_UPDATED, toRealtimeMessage(updated));

    return res.json(updated);
  } catch (error) {
    return sendError(res, error, {
      forbidden: [API_ERROR_CODES.FORBIDDEN_CHANNEL, API_ERROR_CODES.FORBIDDEN_MESSAGE],
      badRequest: CHAT_BAD_REQUEST_ERRORS
    });
  }
});

chatRouter.delete("/channels/:channelId/messages/:messageId", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  const messageId = singleParam(req.params.messageId);
  if (!channelId || !messageId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_PATH_PARAMS });
  }

  try {
    const deleted = await chatService.deleteMessage({
      userId,
      channelId,
      messageId
    });

    const io = getRealtimeServer();
    io?.to(channelId).emit(REALTIME_EVENTS.MESSAGE_DELETED, deleted);

    return res.json(deleted);
  } catch (error) {
    return sendError(res, error, {
      forbidden: [API_ERROR_CODES.FORBIDDEN_CHANNEL, API_ERROR_CODES.FORBIDDEN_MESSAGE],
      badRequest: CHAT_BAD_REQUEST_ERRORS
    });
  }
});

chatRouter.post("/channels/:channelId/read-receipts", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_CHANNEL_ID });
  }

  const parsed = readReceiptSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_BODY, details: parsed.error.issues });
  }

  try {
    const receipt = await chatService.markAsRead({
      channelId,
      userId,
      messageId: parsed.data.messageId
    });

    const io = getRealtimeServer();
    io?.to(channelId).emit(REALTIME_EVENTS.READ_RECEIPT, {
      roomId: channelId,
      messageId: parsed.data.messageId,
      userId
    });

    return res.json(receipt);
  } catch (error) {
    return sendError(res, error, {
      forbidden: [API_ERROR_CODES.FORBIDDEN_CHANNEL],
      badRequest: CHAT_BAD_REQUEST_ERRORS
    });
  }
});

chatRouter.get("/presence", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const parsed = presenceQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_QUERY, details: parsed.error.issues });
  }

  const userIds = parsed.data.userIds
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return res.json(getBulkPresence(userIds));
});

chatRouter.get("/search", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_QUERY, details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.searchMessages({
        userId,
        query: parsed.data.query,
        channelId: parsed.data.channelId,
        limit: parsed.data.limit ?? 20
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.get("/blocks", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  return withErrorBoundary(() => chatService.listBlockedUsers(userId), res, {
    badRequest: CHAT_BAD_REQUEST_ERRORS,
    forbidden: CHAT_FORBIDDEN_ERRORS
  });
});

chatRouter.post("/block/:targetUserId", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const targetUserId = singleParam(req.params.targetUserId);
  if (!targetUserId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_TARGET_USER_ID });
  }

  return withErrorBoundary(
    () =>
      chatService.blockUser({
        blockerId: userId,
        blockedId: targetUserId
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.delete("/block/:targetUserId", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  const targetUserId = singleParam(req.params.targetUserId);
  if (!targetUserId) {
    return res.status(400).json({ error: API_ERROR_CODES.INVALID_TARGET_USER_ID });
  }

  return withErrorBoundary(
    () =>
      chatService.unblockUser({
        blockerId: userId,
        blockedId: targetUserId
      }),
    res,
    {
      badRequest: CHAT_BAD_REQUEST_ERRORS,
      forbidden: CHAT_FORBIDDEN_ERRORS
    }
  );
});

chatRouter.post("/upload", requireUploadsEnabled, upload.single("file"), async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: API_ERROR_CODES.AUTH_REQUIRED });
  }

  if (!req.file) {
    return res.status(400).json({ error: API_ERROR_CODES.FILE_REQUIRED });
  }

  const host = req.get("host");
  const baseUrl = appConfig.publicBaseUrl || (host ? `${req.protocol}://${host}` : "");
  if (!baseUrl) {
    return res.status(500).json({ error: API_ERROR_CODES.PUBLIC_BASE_URL_MISSING });
  }

  const fileUrl = `${baseUrl.replace(/\/$/, "")}/uploads/${encodeURIComponent(req.file.filename)}`;
  return res.json({
    url: fileUrl,
    filename: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype
  });
});