import { z } from "zod";

export const createChannelSchema = z.object({
  type: z.enum(["direct", "group"]),
  name: z.string().min(2).max(60).optional(),
  memberIds: z.array(z.uuid()).min(0)
});

export const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000)
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

export const presenceQuerySchema = z.object({
  userIds: z.string().min(1)
});