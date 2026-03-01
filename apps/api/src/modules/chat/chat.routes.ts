import { Router } from "express";
import type { Response } from "express";
import type { NextFunction } from "express";
import fs from "node:fs";
import multer from "multer";
import { requireAuth, type AuthenticatedRequest } from "./chat.auth.js";
import { chatService } from "./chat.service.js";
import {
  createChannelSchema,
  usernameTargetSchema,
  pagingQuerySchema,
  presenceQuerySchema,
  readReceiptSchema,
  searchQuerySchema,
  sendMessageSchema,
  transferOwnershipSchema,
  updateMemberRoleSchema,
  updateMessageSchema
} from "./chat.validators.js";
import { getRealtimeServer } from "../../realtime.state.js";
import { getBulkPresence } from "../../realtime.presence.js";
import { appConfig } from "../../config.js";
import { prisma } from "../../lib/prisma.js";
import { platformSettingsStore } from "./chat.platform-settings.js";

function singleParam(value: string | string[] | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

function withErrorBoundary<T>(fn: () => Promise<T>, res: Response) {
  fn()
    .then((data) => res.json(data))
    .catch((error: Error) => {
      const message = error.message || "UNEXPECTED_ERROR";
      const status =
        message === "DIRECT_REQUIRES_TWO_MEMBERS" ||
        message === "GROUP_NAME_REQUIRED" ||
        message === "MESSAGE_NOT_FOUND" ||
        message === "INVALID_BLOCK_TARGET" ||
        message === "USER_NOT_FOUND" ||
        message === "GROUP_ONLY" ||
        message === "MEMBER_EXISTS" ||
        message === "INVALID_TARGET_USER" ||
        message === "OWNER_TRANSFER_REQUIRED"
          ? 400
          : message === "FORBIDDEN_CHANNEL" || message === "USER_BLOCKED"
            ? 403
            : 500;
      res.status(status).json({ error: message });
    });
}

export const chatRouter = Router();

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
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  return user?.username?.toLowerCase() === "paul_fmp";
}

async function requirePlatformOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "AUTH_REQUIRED" });
    }
    if (!(await isPlatformOwner(userId))) {
      return res.status(403).json({ error: "FORBIDDEN_OWNER_ONLY" });
    }
    return next();
  } catch {
    return res.status(500).json({ error: "UNEXPECTED_ERROR" });
  }
}

async function requireUploadsEnabled(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const settings = await platformSettingsStore.getSettings();
    if (!settings.uploadsEnabled) {
      return res.status(403).json({ error: "UPLOADS_DISABLED" });
    }
    return next();
  } catch {
    return res.status(500).json({ error: "UNEXPECTED_ERROR" });
  }
}

chatRouter.get("/platform-settings", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "AUTH_REQUIRED" });
    }

    const settings = await platformSettingsStore.getSettings();
    const canManage = await isPlatformOwner(userId);
    return res.json({ ...settings, canManage });
  } catch {
    return res.status(500).json({ error: "UNEXPECTED_ERROR" });
  }
});

chatRouter.patch("/platform-settings/uploads", requirePlatformOwner, async (req: AuthenticatedRequest, res) => {
  const value = req.body?.uploadsEnabled;
  if (typeof value !== "boolean") {
    return res.status(400).json({ error: "INVALID_BODY" });
  }
  const updated = await platformSettingsStore.setUploadsEnabled(value);
  return res.json(updated);
});

chatRouter.get("/channels", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  return withErrorBoundary(() => chatService.listChannels(userId), res);
});

chatRouter.post("/channels", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const parsed = createChannelSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.createChannel({
        ownerId: userId,
        type: parsed.data.type,
        name: parsed.data.name,
        memberIds: parsed.data.memberIds
      }),
    res
  );
});

chatRouter.delete("/channels/:channelId", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: "INVALID_CHANNEL_ID" });
  }

  return withErrorBoundary(
    () =>
      chatService.deleteGroupChannel({
        channelId,
        requesterId: userId
      }),
    res
  );
});

chatRouter.post("/direct/by-username", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const parsed = usernameTargetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.createDirectChannelByUsername({
        ownerId: userId,
        username: parsed.data.username
      }),
    res
  );
});

chatRouter.post("/channels/:channelId/members/by-username", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: "INVALID_CHANNEL_ID" });
  }

  const parsed = usernameTargetSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.addGroupMemberByUsername({
        channelId,
        requesterId: userId,
        username: parsed.data.username
      }),
    res
  );
});

chatRouter.get("/channels/:channelId/members", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: "INVALID_CHANNEL_ID" });
  }

  return withErrorBoundary(
    () =>
      chatService.listChannelMembers({
        channelId,
        requesterId: userId
      }),
    res
  );
});

chatRouter.patch("/channels/:channelId/members/:targetUserId/role", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const channelId = singleParam(req.params.channelId);
  const targetUserId = singleParam(req.params.targetUserId);
  if (!channelId || !targetUserId) {
    return res.status(400).json({ error: "INVALID_PATH_PARAMS" });
  }

  const parsed = updateMemberRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.updateChannelMemberRole({
        channelId,
        requesterId: userId,
        targetUserId,
        role: parsed.data.role
      }),
    res
  );
});

chatRouter.delete("/channels/:channelId/members/me", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: "INVALID_CHANNEL_ID" });
  }

  return withErrorBoundary(
    () =>
      chatService.leaveChannel({
        channelId,
        requesterId: userId
      }),
    res
  );
});

chatRouter.delete("/channels/:channelId/members/:targetUserId", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const channelId = singleParam(req.params.channelId);
  const targetUserId = singleParam(req.params.targetUserId);
  if (!channelId || !targetUserId) {
    return res.status(400).json({ error: "INVALID_PATH_PARAMS" });
  }

  return withErrorBoundary(
    () =>
      chatService.removeChannelMember({
        channelId,
        requesterId: userId,
        targetUserId
      }),
    res
  );
});

chatRouter.post("/channels/:channelId/ownership/transfer", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: "INVALID_CHANNEL_ID" });
  }

  const parsed = transferOwnershipSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.transferChannelOwnership({
        channelId,
        requesterId: userId,
        targetUserId: parsed.data.targetUserId
      }),
    res
  );
});

chatRouter.get("/channels/:channelId/messages", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: "INVALID_CHANNEL_ID" });
  }

  const parsedQuery = pagingQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({ error: "INVALID_QUERY", details: parsedQuery.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.listMessages({
        channelId,
        userId,
        cursor: parsedQuery.data.cursor,
        limit: parsedQuery.data.limit ?? 30
      }),
    res
  );
});

chatRouter.post("/channels/:channelId/messages", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: "INVALID_CHANNEL_ID" });
  }

  const parsed = sendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  try {
    const sent = await chatService.sendMessage({
      channelId,
      userId,
      content: parsed.data.content
    });

    const io = getRealtimeServer();
    io?.to(channelId).emit("new_message", sent);

    return res.json(sent);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNEXPECTED_ERROR";
    const status = message === "FORBIDDEN_CHANNEL" || message === "USER_BLOCKED" ? 403 : 500;
    return res.status(status).json({ error: message });
  }
});

chatRouter.patch("/channels/:channelId/messages/:messageId", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const channelId = singleParam(req.params.channelId);
  const messageId = singleParam(req.params.messageId);
  if (!channelId || !messageId) {
    return res.status(400).json({ error: "INVALID_PATH_PARAMS" });
  }

  const parsed = updateMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  try {
    const updated = await chatService.updateMessage({
      userId,
      channelId,
      messageId,
      content: parsed.data.content
    });

    const io = getRealtimeServer();
    io?.to(channelId).emit("message_updated", updated);

    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNEXPECTED_ERROR";
    const status =
      message === "FORBIDDEN_CHANNEL" || message === "FORBIDDEN_MESSAGE"
        ? 403
        : message === "MESSAGE_NOT_FOUND"
          ? 400
          : 500;
    return res.status(status).json({ error: message });
  }
});

chatRouter.delete("/channels/:channelId/messages/:messageId", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const channelId = singleParam(req.params.channelId);
  const messageId = singleParam(req.params.messageId);
  if (!channelId || !messageId) {
    return res.status(400).json({ error: "INVALID_PATH_PARAMS" });
  }

  try {
    const deleted = await chatService.deleteMessage({
      userId,
      channelId,
      messageId
    });

    const io = getRealtimeServer();
    io?.to(channelId).emit("message_deleted", deleted);

    return res.json(deleted);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNEXPECTED_ERROR";
    const status =
      message === "FORBIDDEN_CHANNEL" || message === "FORBIDDEN_MESSAGE"
        ? 403
        : message === "MESSAGE_NOT_FOUND"
          ? 400
          : 500;
    return res.status(status).json({ error: message });
  }
});

chatRouter.post("/channels/:channelId/read-receipts", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const channelId = singleParam(req.params.channelId);
  if (!channelId) {
    return res.status(400).json({ error: "INVALID_CHANNEL_ID" });
  }

  const parsed = readReceiptSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_BODY", details: parsed.error.issues });
  }

  try {
    const receipt = await chatService.markAsRead({
      channelId,
      userId,
      messageId: parsed.data.messageId
    });

    const io = getRealtimeServer();
    io?.to(channelId).emit("read_receipt", {
      roomId: channelId,
      messageId: parsed.data.messageId,
      userId
    });

    return res.json(receipt);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNEXPECTED_ERROR";
    const status = message === "FORBIDDEN_CHANNEL" ? 403 : message === "MESSAGE_NOT_FOUND" ? 400 : 500;
    return res.status(status).json({ error: message });
  }
});

chatRouter.get("/presence", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const parsed = presenceQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_QUERY", details: parsed.error.issues });
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
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "INVALID_QUERY", details: parsed.error.issues });
  }

  return withErrorBoundary(
    () =>
      chatService.searchMessages({
        userId,
        query: parsed.data.query,
        channelId: parsed.data.channelId,
        limit: parsed.data.limit ?? 20
      }),
    res
  );
});

chatRouter.get("/blocks", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  return withErrorBoundary(() => chatService.listBlockedUsers(userId), res);
});

chatRouter.post("/block/:targetUserId", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const targetUserId = singleParam(req.params.targetUserId);
  if (!targetUserId) {
    return res.status(400).json({ error: "INVALID_TARGET_USER_ID" });
  }

  return withErrorBoundary(
    () =>
      chatService.blockUser({
        blockerId: userId,
        blockedId: targetUserId
      }),
    res
  );
});

chatRouter.delete("/block/:targetUserId", async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  const targetUserId = singleParam(req.params.targetUserId);
  if (!targetUserId) {
    return res.status(400).json({ error: "INVALID_TARGET_USER_ID" });
  }

  return withErrorBoundary(
    () =>
      chatService.unblockUser({
        blockerId: userId,
        blockedId: targetUserId
      }),
    res
  );
});

chatRouter.post("/upload", requireUploadsEnabled, upload.single("file"), async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ error: "AUTH_REQUIRED" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "FILE_REQUIRED" });
  }

  const host = req.get("host");
  const baseUrl = appConfig.publicBaseUrl || (host ? `${req.protocol}://${host}` : "");
  if (!baseUrl) {
    return res.status(500).json({ error: "PUBLIC_BASE_URL_MISSING" });
  }

  const fileUrl = `${baseUrl.replace(/\/$/, "")}/uploads/${encodeURIComponent(req.file.filename)}`;
  return res.json({
    url: fileUrl,
    filename: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype
  });
});