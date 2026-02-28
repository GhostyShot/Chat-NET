import { prisma } from "../../lib/prisma.js";

function dedupeMemberIds(ownerId: string, memberIds: string[]) {
  return Array.from(new Set([ownerId, ...memberIds]));
}

export class ChatService {
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
      orderBy: {
        updatedAt: "desc"
      }
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
      throw new Error("DIRECT_REQUIRES_TWO_MEMBERS");
    }

    if (input.type === "direct") {
      const otherId = memberIds.find((id) => id !== input.ownerId);
      if (otherId && (await this.areUsersBlocked(input.ownerId, otherId))) {
        throw new Error("USER_BLOCKED");
      }
    }

    if (input.type === "group" && !input.name) {
      throw new Error("GROUP_NAME_REQUIRED");
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

  async sendMessage(input: { channelId: string; userId: string; content: string }) {
    const membership = await prisma.channelMembership.findUnique({
      where: {
        userId_channelId: {
          userId: input.userId,
          channelId: input.channelId
        }
      }
    });

    if (!membership) {
      throw new Error("FORBIDDEN_CHANNEL");
    }

    const memberships = await prisma.channelMembership.findMany({
      where: { channelId: input.channelId },
      select: { userId: true }
    });

    for (const participant of memberships) {
      if (participant.userId !== input.userId && (await this.areUsersBlocked(input.userId, participant.userId))) {
        throw new Error("USER_BLOCKED");
      }
    }

    const message = await prisma.message.create({
      data: {
        channelId: input.channelId,
        senderId: input.userId,
        content: input.content
      },
      include: {
        sender: {
          select: {
            id: true,
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
      throw new Error("FORBIDDEN_CHANNEL");
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
            displayName: true,
            avatarUrl: true
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

  async markAsRead(input: { userId: string; channelId: string; messageId: string }) {
    const message = await prisma.message.findFirst({
      where: {
        id: input.messageId,
        channelId: input.channelId
      }
    });

    if (!message) {
      throw new Error("MESSAGE_NOT_FOUND");
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
      throw new Error("FORBIDDEN_CHANNEL");
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
      throw new Error("FORBIDDEN_CHANNEL");
    }

    const message = await prisma.message.findFirst({
      where: {
        id: input.messageId,
        channelId: input.channelId
      }
    });

    if (!message) {
      throw new Error("MESSAGE_NOT_FOUND");
    }

    if (message.senderId !== input.userId) {
      throw new Error("FORBIDDEN_MESSAGE");
    }

    return prisma.message.update({
      where: { id: message.id },
      data: { content: input.content },
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true
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
      throw new Error("FORBIDDEN_CHANNEL");
    }

    const message = await prisma.message.findFirst({
      where: {
        id: input.messageId,
        channelId: input.channelId
      }
    });

    if (!message) {
      throw new Error("MESSAGE_NOT_FOUND");
    }

    if (message.senderId !== input.userId) {
      throw new Error("FORBIDDEN_MESSAGE");
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
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });
  }

  async blockUser(input: { blockerId: string; blockedId: string }) {
    if (input.blockerId === input.blockedId) {
      throw new Error("INVALID_BLOCK_TARGET");
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