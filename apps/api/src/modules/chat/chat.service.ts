import { prisma } from "../../lib/prisma.js";
import { API_ERROR_CODES, type ChannelSummaryResponse, type PollItem } from "@chatnet/shared";
import { appConfig } from "../../config.js";

function dedupeMemberIds(ownerId: string, memberIds: string[]) {
  return Array.from(new Set([ownerId, ...memberIds]));
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase().replace(/^@/, "");
}

export class ChatService {
  private mapPoll(poll: {
    id: string;
    channelId: string;
    question: string;
    isClosed: boolean;
    createdAt: Date;
    creator: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    };
    options: Array<{
      id: string;
      label: string;
      votes: Array<{ userId: string }>;
    }>;
  }, userId: string): PollItem {
    const options = poll.options.map((option) => ({
      id: option.id,
      label: option.label,
      voteCount: option.votes.length
    }));
    const votedOption = poll.options.find((option) => option.votes.some((vote) => vote.userId === userId));
    const totalVotes = options.reduce((sum, option) => sum + option.voteCount, 0);

    return {
      id: poll.id,
      channelId: poll.channelId,
      question: poll.question,
      isClosed: poll.isClosed,
      createdAt: poll.createdAt.toISOString(),
      creator: {
        id: poll.creator.id,
        username: poll.creator.username,
        displayName: poll.creator.displayName,
        avatarUrl: poll.creator.avatarUrl
      },
      options,
      votedOptionId: votedOption?.id ?? null,
      totalVotes
    };
  }

  private buildFallbackSummary(channelMessages: Array<{ content: string; sender: { displayName: string } }>, days: number): string {
    const cleaned = channelMessages
      .map((item) => ({
        sender: item.sender.displayName,
        content: item.content.replace(/\s+/g, " ").trim()
      }))
      .filter((item) => item.content.length > 0);

    if (cleaned.length === 0) {
      return `Keine auswertbaren Nachrichten in den letzten ${days} Tagen.`;
    }

    const senderCounter = new Map<string, number>();
    for (const message of cleaned) {
      senderCounter.set(message.sender, (senderCounter.get(message.sender) ?? 0) + 1);
    }
    const topSenders = Array.from(senderCounter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([sender, count]) => `${sender} (${count})`)
      .join(", ");

    const highlights = cleaned
      .slice(0, 80)
      .sort((a, b) => b.content.length - a.content.length)
      .slice(0, 5)
      .map((item) => `${item.sender}: ${item.content}`);

    return [
      `Zusammenfassung der letzten ${days} Tage (${cleaned.length} Nachrichten).`,
      topSenders ? `Aktivste Personen: ${topSenders}.` : "",
      "Wichtige Punkte:",
      ...highlights.map((entry) => `- ${entry}`)
    ]
      .filter(Boolean)
      .join("\n");
  }

  private async summarizeWithFreeAi(text: string): Promise<string | null> {
    const huggingFaceToken = process.env.HUGGINGFACE_API_TOKEN?.trim();
    if (!huggingFaceToken) {
      return null;
    }

    const model = process.env.HUGGINGFACE_SUMMARY_MODEL?.trim() || "facebook/bart-large-cnn";
    const endpoint = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${huggingFaceToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true }
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as unknown;

    if (Array.isArray(data) && data.length > 0) {
      const first = data[0] as { summary_text?: unknown; generated_text?: unknown };
      if (typeof first.summary_text === "string" && first.summary_text.trim()) {
        return first.summary_text.trim();
      }
      if (typeof first.generated_text === "string" && first.generated_text.trim()) {
        return first.generated_text.trim();
      }
    }

    if (data && typeof data === "object") {
      const candidate = data as { summary_text?: unknown; generated_text?: unknown };
      if (typeof candidate.summary_text === "string" && candidate.summary_text.trim()) {
        return candidate.summary_text.trim();
      }
      if (typeof candidate.generated_text === "string" && candidate.generated_text.trim()) {
        return candidate.generated_text.trim();
      }
    }

    return null;
  }

  private async getMembershipRole(channelId: string, userId: string): Promise<"OWNER" | "ADMIN" | "MEMBER" | null> {
    const membership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId,
          channelId
        }
      },
      select: {
        role: true
      }
    });
    return membership?.role ?? null;
  }

  private async areUsersBlocked(a: string, b: string): Promise<boolean> {
    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a }
        ]
      }
    });
    return Boolean(block);
  }

  async listChannels(userId: string) {
    return prisma.channel.findMany({
      where: {
        memberships: {
          some: { userId }
        }
      },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: [{ isSystem: "desc" }, { updatedAt: "desc" }]
    });
  }

  async createChannel(input: {
    ownerId: string;
    type: "direct" | "group";
    name?: string;
    memberIds: string[];
  }) {
    const memberIds = dedupeMemberIds(input.ownerId, input.memberIds);

    if (input.type === "direct" && memberIds.length !== 2) {
      throw new Error(API_ERROR_CODES.DIRECT_REQUIRES_TWO_MEMBERS);
    }

    if (input.type === "direct") {
      const otherId = memberIds.find((id) => id !== input.ownerId);
      if (otherId && (await this.areUsersBlocked(input.ownerId, otherId))) {
        throw new Error(API_ERROR_CODES.USER_BLOCKED);
      }
    }

    if (input.type === "group" && !input.name) {
      throw new Error(API_ERROR_CODES.GROUP_NAME_REQUIRED);
    }

    return prisma.channel.create({
      data: {
        type: input.type === "direct" ? "DIRECT" : "GROUP",
        name: input.type === "group" ? input.name : null,
        createdById: input.ownerId,
        memberships: {
          createMany: {
            data: memberIds.map((id) => ({
              userId: id,
              role: id === input.ownerId ? "OWNER" : "MEMBER"
            }))
          }
        }
      },
      include: {
        memberships: true
      }
    });
  }

  async deleteGroupChannel(input: { channelId: string; requesterId: string }) {
    const channel = await prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!channel) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    if (channel.type !== "GROUP") {
      throw new Error(API_ERROR_CODES.GROUP_ONLY);
    }

    const requesterRole = await this.getMembershipRole(input.channelId, input.requesterId);
    if (requesterRole !== "OWNER") {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    await prisma.channel.delete({
      where: { id: input.channelId }
    });

    return { ok: true, deletedChannelId: input.channelId };
  }

  async createDirectChannelByUsername(input: { ownerId: string; username: string }) {
    const targetUsername = normalizeUsername(input.username);

    const owner = await prisma.user.findUnique({ where: { id: input.ownerId } });
    if (!owner) {
      throw new Error(API_ERROR_CODES.INVALID_TARGET_USER);
    }

    if (owner.username === targetUsername) {
      throw new Error(API_ERROR_CODES.INVALID_TARGET_USER);
    }

    const targetUser = await prisma.user.findUnique({
      where: { username: targetUsername }
    });

    if (!targetUser) {
      throw new Error(API_ERROR_CODES.USER_NOT_FOUND);
    }

    if (await this.areUsersBlocked(input.ownerId, targetUser.id)) {
      throw new Error(API_ERROR_CODES.USER_BLOCKED);
    }

    const existing = await prisma.channel.findFirst({
      where: {
        type: "DIRECT",
        AND: [
          { memberships: { some: { userId: input.ownerId } } },
          { memberships: { some: { userId: targetUser.id } } }
        ]
      }
    });

    if (existing) {
      return existing;
    }

    return prisma.channel.create({
      data: {
        type: "DIRECT",
        name: null,
        createdById: input.ownerId,
        memberships: {
          createMany: {
            data: [
              { userId: input.ownerId, role: "OWNER" },
              { userId: targetUser.id, role: "MEMBER" }
            ]
          }
        }
      }
    });
  }

  async addGroupMemberByUsername(input: { channelId: string; requesterId: string; username: string }) {
    const targetUsername = normalizeUsername(input.username);

    const targetUser = await prisma.user.findUnique({ where: { username: targetUsername } });
    if (!targetUser) {
      throw new Error(API_ERROR_CODES.USER_NOT_FOUND);
    }

    const channel = await prisma.channel.findUnique({
      where: { id: input.channelId },
      include: {
        memberships: true
      }
    });

    if (!channel) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    if (channel.type !== "GROUP") {
      throw new Error(API_ERROR_CODES.GROUP_ONLY);
    }

    const requesterMembership = channel.memberships.find((item) => item.userId === input.requesterId);
    if (!requesterMembership || requesterMembership.role !== "OWNER") {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    if (targetUser.id === input.requesterId) {
      throw new Error(API_ERROR_CODES.INVALID_TARGET_USER);
    }

    const alreadyMember = channel.memberships.some((item) => item.userId === targetUser.id);
    if (alreadyMember) {
      throw new Error(API_ERROR_CODES.MEMBER_EXISTS);
    }

    for (const membership of channel.memberships) {
      if (await this.areUsersBlocked(targetUser.id, membership.userId)) {
        throw new Error(API_ERROR_CODES.USER_BLOCKED);
      }
    }

    const created = await prisma.channelMembership.create({
      data: {
        channelId: input.channelId,
        userId: targetUser.id,
        role: "MEMBER"
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    await prisma.channel.update({
      where: { id: input.channelId },
      data: { updatedAt: new Date() }
    });

    return created;
  }

  async listChannelMembers(input: { channelId: string; requesterId: string }) {
    const requesterRole = await this.getMembershipRole(input.channelId, input.requesterId);
    if (!requesterRole) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const channel = await prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!channel) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    return prisma.channelMembership.findMany({
      where: { channelId: input.channelId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }]
    });
  }

  async updateChannelMemberRole(input: {
    channelId: string;
    requesterId: string;
    targetUserId: string;
    role: "admin" | "member";
  }) {
    const channel = await prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!channel) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    if (channel.type !== "GROUP") {
      throw new Error(API_ERROR_CODES.GROUP_ONLY);
    }

    const requesterRole = await this.getMembershipRole(input.channelId, input.requesterId);
    if (requesterRole !== "OWNER") {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const targetMembership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.targetUserId,
          channelId: input.channelId
        }
      }
    });

    if (!targetMembership) {
      throw new Error(API_ERROR_CODES.USER_NOT_FOUND);
    }

    if (targetMembership.role === "OWNER" || input.targetUserId === input.requesterId) {
      throw new Error(API_ERROR_CODES.INVALID_TARGET_USER);
    }

    const nextRole = input.role === "admin" ? "ADMIN" : "MEMBER";
    return prisma.channelMembership.update({
      where: {
        userId_channelId: {
          userId: input.targetUserId,
          channelId: input.channelId
        }
      },
      data: {
        role: nextRole
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });
  }

  async removeChannelMember(input: { channelId: string; requesterId: string; targetUserId: string }) {
    const channel = await prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!channel) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    if (channel.type !== "GROUP") {
      throw new Error(API_ERROR_CODES.GROUP_ONLY);
    }

    const requesterRole = await this.getMembershipRole(input.channelId, input.requesterId);
    if (!requesterRole || (requesterRole !== "OWNER" && requesterRole !== "ADMIN")) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const targetMembership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.targetUserId,
          channelId: input.channelId
        }
      }
    });

    if (!targetMembership) {
      throw new Error(API_ERROR_CODES.USER_NOT_FOUND);
    }

    if (targetMembership.role === "OWNER") {
      throw new Error(API_ERROR_CODES.INVALID_TARGET_USER);
    }

    if (input.targetUserId === input.requesterId) {
      throw new Error(API_ERROR_CODES.INVALID_TARGET_USER);
    }

    if (requesterRole === "ADMIN" && targetMembership.role !== "MEMBER") {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    await prisma.channelMembership.delete({
      where: {
        userId_channelId: {
          userId: input.targetUserId,
          channelId: input.channelId
        }
      }
    });

    return { ok: true, removedUserId: input.targetUserId };
  }

  async transferChannelOwnership(input: { channelId: string; requesterId: string; targetUserId: string }) {
    const channel = await prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!channel) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    if (channel.type !== "GROUP") {
      throw new Error(API_ERROR_CODES.GROUP_ONLY);
    }

    if (input.requesterId === input.targetUserId) {
      throw new Error(API_ERROR_CODES.INVALID_TARGET_USER);
    }

    const requesterRole = await this.getMembershipRole(input.channelId, input.requesterId);
    if (requesterRole !== "OWNER") {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const targetMembership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.targetUserId,
          channelId: input.channelId
        }
      }
    });

    if (!targetMembership) {
      throw new Error(API_ERROR_CODES.USER_NOT_FOUND);
    }

    await prisma.$transaction([
      prisma.channelMembership.update({
        where: {
          userId_channelId: {
            userId: input.requesterId,
            channelId: input.channelId
          }
        },
        data: {
          role: "ADMIN"
        }
      }),
      prisma.channelMembership.update({
        where: {
          userId_channelId: {
            userId: input.targetUserId,
            channelId: input.channelId
          }
        },
        data: {
          role: "OWNER"
        }
      }),
      prisma.channel.update({
        where: { id: input.channelId },
        data: { updatedAt: new Date() }
      })
    ]);

    return { ok: true, channelId: input.channelId, ownerUserId: input.targetUserId };
  }

  async leaveChannel(input: { channelId: string; requesterId: string }) {
    const channel = await prisma.channel.findUnique({ where: { id: input.channelId } });
    if (!channel) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    if (channel.type !== "GROUP") {
      throw new Error(API_ERROR_CODES.GROUP_ONLY);
    }

    const membership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.requesterId,
          channelId: input.channelId
        }
      }
    });

    if (!membership) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    if (membership.role === "OWNER") {
      throw new Error(API_ERROR_CODES.OWNER_TRANSFER_REQUIRED);
    }

    await prisma.channelMembership.delete({
      where: {
        userId_channelId: {
          userId: input.requesterId,
          channelId: input.channelId
        }
      }
    });

    await prisma.channel.update({
      where: { id: input.channelId },
      data: { updatedAt: new Date() }
    });

    return { ok: true, leftUserId: input.requesterId, channelId: input.channelId };
  }

  async sendMessage(input: { channelId: string; userId: string; content: string; replyToMessageId?: string }) {
    const membership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.userId,
          channelId: input.channelId
        }
      }
    });

    if (!membership) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const channel = await prisma.channel.findUnique({
      where: { id: input.channelId },
      select: {
        id: true,
        isSystem: true,
        postingPolicy: true
      }
    });

    if (!channel) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const isConfiguredPlatformOwner = Boolean(appConfig.platformOwnerUserId && input.userId === appConfig.platformOwnerUserId);
    const isOwnerMembership = membership.role === "OWNER";
    const canPostAsOwner = isConfiguredPlatformOwner || isOwnerMembership;

    if (channel.isSystem && !canPostAsOwner) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    if (channel.postingPolicy === "OWNER_ONLY" && !canPostAsOwner) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    if (channel.postingPolicy === "ADMINS_ONLY" && !(membership.role === "ADMIN" || canPostAsOwner)) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    if (input.replyToMessageId) {
      const replyTarget = await prisma.message.findFirst({
        where: {
          id: input.replyToMessageId,
          channelId: input.channelId
        }
      });
      if (!replyTarget) {
        throw new Error(API_ERROR_CODES.MESSAGE_NOT_FOUND);
      }
    }

    const memberships = await prisma.channelMembership.findMany({
      where: { channelId: input.channelId },
      select: { userId: true }
    });

    for (const participant of memberships) {
      if (participant.userId !== input.userId && (await this.areUsersBlocked(input.userId, participant.userId))) {
        throw new Error(API_ERROR_CODES.USER_BLOCKED);
      }
    }

    const message = await prisma.message.create({
      data: {
        channelId: input.channelId,
        senderId: input.userId,
        content: input.content,
        replyToId: input.replyToMessageId
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    await prisma.channel.update({
      where: { id: input.channelId },
      data: { updatedAt: new Date() }
    });

    return message;
  }

  async listMessages(input: { channelId: string; userId: string; cursor?: string; limit: number }) {
    const membership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.userId,
          channelId: input.channelId
        }
      }
    });

    if (!membership) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const messages = await prisma.message.findMany({
      where: { channelId: input.channelId },
      orderBy: { createdAt: "desc" },
      take: input.limit,
      ...(input.cursor
        ? {
            cursor: { id: input.cursor },
            skip: 1
          }
        : {}),
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: {
            readReceipts: true
          }
        }
      }
    });

    return {
      items: messages,
      nextCursor: messages.length === input.limit ? messages[messages.length - 1]?.id : undefined
    };
  }

  async summarizeChannel(input: {
    channelId: string;
    userId: string;
    days: number;
    limit: number;
  }): Promise<ChannelSummaryResponse> {
    const membership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.userId,
          channelId: input.channelId
        }
      }
    });

    if (!membership) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);

    const messages = await prisma.message.findMany({
      where: {
        channelId: input.channelId,
        createdAt: {
          gte: since
        }
      },
      orderBy: { createdAt: "desc" },
      take: input.limit,
      include: {
        sender: {
          select: {
            displayName: true
          }
        }
      }
    });

    if (messages.length === 0) {
      return {
        summary: `Keine Nachrichten in den letzten ${input.days} Tagen.`,
        source: "fallback",
        messageCount: 0,
        days: input.days,
        limit: input.limit
      };
    }

    const orderedForPrompt = [...messages].reverse();
    const plainTranscript = orderedForPrompt
      .map((entry) => `${entry.sender.displayName}: ${entry.content.replace(/\s+/g, " ").trim()}`)
      .filter((line) => line.length > 0)
      .join("\n");

    const prompt = [
      "Du bist ein Assistent für Chat-Zusammenfassungen.",
      "Fasse den Verlauf auf Deutsch zusammen.",
      "Gib genau 5 kurze Stichpunkte mit klaren Entscheidungen, Aufgaben und offenen Punkten.",
      "Wenn es keine Aufgaben gibt, schreibe das explizit.",
      "",
      "Chatverlauf:",
      plainTranscript
    ].join("\n");

    try {
      const aiSummary = await this.summarizeWithFreeAi(prompt);
      if (aiSummary) {
        return {
          summary: aiSummary,
          source: "ai",
          messageCount: messages.length,
          days: input.days,
          limit: input.limit
        };
      }
    } catch {}

    return {
      summary: this.buildFallbackSummary(
        orderedForPrompt.map((entry) => ({ content: entry.content, sender: { displayName: entry.sender.displayName } })),
        input.days
      ),
      source: "fallback",
      messageCount: messages.length,
      days: input.days,
      limit: input.limit
    };
  }

  async markAsRead(input: { userId: string; channelId: string; messageId: string }) {
    const message = await prisma.message.findFirst({
      where: {
        id: input.messageId,
        channelId: input.channelId
      }
    });

    if (!message) {
      throw new Error(API_ERROR_CODES.MESSAGE_NOT_FOUND);
    }

    const membership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.userId,
          channelId: input.channelId
        }
      }
    });

    if (!membership) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const receipt = await prisma.readReceipt.upsert({
      where: {
        userId_messageId: {
          userId: input.userId,
          messageId: input.messageId
        }
      },
      create: {
        userId: input.userId,
        messageId: input.messageId
      },
      update: {
        readAt: new Date()
      }
    });

    return receipt;
  }

  async updateMessage(input: { userId: string; channelId: string; messageId: string; content: string }) {
    const membership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.userId,
          channelId: input.channelId
        }
      }
    });

    if (!membership) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const message = await prisma.message.findFirst({
      where: {
        id: input.messageId,
        channelId: input.channelId
      }
    });

    if (!message) {
      throw new Error(API_ERROR_CODES.MESSAGE_NOT_FOUND);
    }

    if (message.senderId !== input.userId) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_MESSAGE);
    }

    return prisma.message.update({
      where: { id: message.id },
      data: { content: input.content },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });
  }

  async deleteMessage(input: { userId: string; channelId: string; messageId: string }) {
    const membership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.userId,
          channelId: input.channelId
        }
      }
    });

    if (!membership) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const message = await prisma.message.findFirst({
      where: {
        id: input.messageId,
        channelId: input.channelId
      }
    });

    if (!message) {
      throw new Error(API_ERROR_CODES.MESSAGE_NOT_FOUND);
    }

    if (message.senderId !== input.userId) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_MESSAGE);
    }

    await prisma.message.delete({ where: { id: message.id } });
    return { id: message.id, deleted: true };
  }

  async searchMessages(input: { userId: string; query: string; channelId?: string; limit: number }) {
    const memberships = await prisma.channelMembership.findMany({
      where: { userId: input.userId },
      select: { channelId: true }
    });

    const channelIds = memberships.map((item) => item.channelId);
    if (!channelIds.length) {
      return [];
    }

    const scopedChannelIds = input.channelId
      ? channelIds.filter((id) => id === input.channelId)
      : channelIds;

    if (!scopedChannelIds.length) {
      return [];
    }

    return prisma.message.findMany({
      where: {
        channelId: { in: scopedChannelIds },
        content: {
          contains: input.query,
          mode: "insensitive"
        }
      },
      take: input.limit,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });
  }

  async listPolls(input: { channelId: string; userId: string }) {
    const membership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.userId,
          channelId: input.channelId
        }
      }
    });

    if (!membership) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const polls = await prisma.poll.findMany({
      where: { channelId: input.channelId },
      orderBy: { createdAt: "desc" },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        options: {
          include: {
            votes: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });

    return polls.map((poll) => this.mapPoll(poll, input.userId));
  }

  async createPoll(input: { channelId: string; userId: string; question: string; options: string[] }) {
    const membership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.userId,
          channelId: input.channelId
        }
      }
    });

    if (!membership) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const uniqueOptions = Array.from(new Set(input.options.map((entry) => entry.trim()).filter(Boolean)));
    if (uniqueOptions.length < 2) {
      throw new Error(API_ERROR_CODES.POLL_OPTION_INVALID);
    }

    const poll = await prisma.poll.create({
      data: {
        channelId: input.channelId,
        creatorId: input.userId,
        question: input.question.trim(),
        options: {
          create: uniqueOptions.map((label) => ({ label }))
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        options: {
          include: {
            votes: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });

    await prisma.channel.update({
      where: { id: input.channelId },
      data: { updatedAt: new Date() }
    });

    return this.mapPoll(poll, input.userId);
  }

  async votePoll(input: { channelId: string; pollId: string; optionId: string; userId: string }) {
    const membership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.userId,
          channelId: input.channelId
        }
      }
    });

    if (!membership) {
      throw new Error(API_ERROR_CODES.FORBIDDEN_CHANNEL);
    }

    const poll = await prisma.poll.findFirst({
      where: {
        id: input.pollId,
        channelId: input.channelId
      },
      select: {
        id: true,
        isClosed: true
      }
    });

    if (!poll) {
      throw new Error(API_ERROR_CODES.POLL_NOT_FOUND);
    }

    if (poll.isClosed) {
      throw new Error(API_ERROR_CODES.POLL_CLOSED);
    }

    const option = await prisma.pollOption.findFirst({
      where: {
        id: input.optionId,
        pollId: input.pollId
      },
      select: { id: true }
    });

    if (!option) {
      throw new Error(API_ERROR_CODES.POLL_OPTION_INVALID);
    }

    await prisma.pollVote.upsert({
      where: {
        pollId_userId: {
          pollId: input.pollId,
          userId: input.userId
        }
      },
      create: {
        pollId: input.pollId,
        userId: input.userId,
        optionId: input.optionId
      },
      update: {
        optionId: input.optionId
      }
    });

    const refreshedPoll = await prisma.poll.findUnique({
      where: { id: input.pollId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        options: {
          include: {
            votes: {
              select: {
                userId: true
              }
            }
          }
        }
      }
    });

    if (!refreshedPoll) {
      throw new Error(API_ERROR_CODES.POLL_NOT_FOUND);
    }

    return this.mapPoll(refreshedPoll, input.userId);
  }

  async blockUser(input: { blockerId: string; blockedId: string }) {
    if (input.blockerId === input.blockedId) {
      throw new Error(API_ERROR_CODES.INVALID_BLOCK_TARGET);
    }

    return prisma.userBlock.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: input.blockerId,
          blockedId: input.blockedId
        }
      },
      update: {},
      create: {
        blockerId: input.blockerId,
        blockedId: input.blockedId
      }
    });
  }

  async unblockUser(input: { blockerId: string; blockedId: string }) {
    await prisma.userBlock.deleteMany({
      where: {
        blockerId: input.blockerId,
        blockedId: input.blockedId
      }
    });
    return { ok: true };
  }

  async listBlockedUsers(userId: string) {
    return prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }
}

export const chatService = new ChatService();