import { prisma } from "../../lib/prisma.js";
import { randomBytes } from "node:crypto";
import type { StoredUser, StoredEmailToken } from "./auth.types.js";

type CreateUserInput = {
  email: string;
  displayName: string;
  username?: string;
  provider: "google" | "password";
  verifiedEmail: boolean;
  passwordHash?: string;
};

type CreateEmailTokenInput = {
  userId: string;
  type: "verify" | "reset";
  expiresAt: Date;
};

function toStoredUser(u: {
  id: string;
  email: string;
  username: string;
  userCode: string;
  displayName: string;
  avatarUrl: string | null;
  provider: string;
  verifiedEmail: boolean;
  passwordHash: string | null;
  statusEmoji: string | null;
  statusText: string | null;
  statusExpiresAt: Date | null;
}): StoredUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    userCode: u.userCode,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl ?? undefined,
    provider: u.provider as "google" | "password",
    verifiedEmail: u.verifiedEmail,
    passwordHash: u.passwordHash ?? undefined,
    statusEmoji: u.statusEmoji ?? undefined,
    statusText: u.statusText ?? undefined,
    statusExpiresAt: u.statusExpiresAt ?? undefined,
  };
}

export const authStore = {
  normalizeUsername(raw: string): string {
    return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  },

  async getByEmail(email: string): Promise<StoredUser | null> {
    const u = await prisma.user.findUnique({ where: { email } });
    return u ? toStoredUser(u) : null;
  },

  async getById(id: string): Promise<StoredUser | null> {
    const u = await prisma.user.findUnique({ where: { id } });
    return u ? toStoredUser(u) : null;
  },

  async searchUsers(q: string): Promise<StoredUser[]> {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 10,
    });
    return users.map(toStoredUser);
  },

  async createUser(input: CreateUserInput): Promise<StoredUser> {
    const userCode = randomBytes(3).toString("hex").toUpperCase();
    const baseUsername = input.username
      ?? this.normalizeUsername(input.email.split("@")[0] ?? "user");

    let username = baseUsername.slice(0, 24);
    if (username.length < 3) username = `user${userCode.toLowerCase()}`;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) username = `${username.slice(0, 18)}${userCode.toLowerCase()}`;

    const u = await prisma.user.create({
      data: {
        email: input.email,
        displayName: input.displayName,
        username,
        userCode,
        provider: input.provider,
        verifiedEmail: input.verifiedEmail,
        passwordHash: input.passwordHash ?? null,
      },
    });
    return toStoredUser(u);
  },

  async updateUser(user: StoredUser): Promise<StoredUser> {
    const u = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl ?? null,
        passwordHash: user.passwordHash ?? null,
        verifiedEmail: user.verifiedEmail,
        statusEmoji: user.statusEmoji ?? null,
        statusText: user.statusText ?? null,
        statusExpiresAt: user.statusExpiresAt ?? null,
      },
    });
    return toStoredUser(u);
  },

  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    const u = await prisma.user.findUnique({ where: { username } });
    if (!u) return false;
    return u.id !== excludeUserId;
  },

  async createEmailToken(input: CreateEmailTokenInput): Promise<string> {
    const token = randomBytes(32).toString("hex");
    await prisma.emailToken.create({
      data: {
        token,
        userId: input.userId,
        type: input.type.toUpperCase() as "VERIFY" | "RESET",
        expiresAt: input.expiresAt,
      },
    });
    return token;
  },

  async consumeEmailToken(token: string, type: "verify" | "reset"): Promise<StoredEmailToken | null> {
    const record = await prisma.emailToken.findUnique({ where: { token } });
    if (!record) return null;
    if (record.type !== type.toUpperCase()) return null;
    if (record.expiresAt < new Date()) return null;
    if (record.usedAt) return null;
    await prisma.emailToken.update({ where: { token }, data: { usedAt: new Date() } });
    return { token: record.token, userId: record.userId, type: record.type as "VERIFY" | "RESET" };
  },
};
