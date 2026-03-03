import { z } from "zod";

export const createChannelSchema = z.object({
  type: z.enum(["direct", "group"]),
  name: z.string().min(2).max(60).optional(),
  memberIds: z.array(z.uuid()).min(0)
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
  replyToMessageId: z.uuid().optional()
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(4000)
});

export const readReceiptSchema = z.object({
  messageId: z.uuid()
});

export const pagingQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const searchQuerySchema = z.object({
  query: z.string().min(2).max(120),
  channelId: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional()
});

export const channelSummarySchema = z.object({
  days: z.coerce.number().int().min(1).max(7).optional(),
  limit: z.coerce.number().int().min(1).max(150).optional()
});

export const createPollSchema = z.object({
  question: z.string().trim().min(5).max(240),
  options: z.array(z.string().trim().min(1).max(120)).min(2).max(8)
});

export const votePollSchema = z.object({
  optionId: z.uuid()
});

export const presenceQuerySchema = z.object({
  userIds: z.string().min(1)
});

export const usernameTargetSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value.replace(/^@/, ""))
    .refine((value) => /^[a-z0-9_]{3,24}$/u.test(value), "USERNAME_INVALID_FORMAT")
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member"])
});

export const transferOwnershipSchema = z.object({
  targetUserId: z.uuid()
});