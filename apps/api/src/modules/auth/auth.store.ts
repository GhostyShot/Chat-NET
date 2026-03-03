import type { AuthProvider as DbAuthProvider, EmailTokenType as DbEmailTokenType, User } from "@prisma/client";
import { v4 as uuid } from "uuid";
import { prisma } from "../../lib/prisma.js";
import type { CreateEmailTokenInput, CreateUserInput, EmailTokenRecord, StoredUser } from "./auth.types.js";
import { appConfig } from "../../config.js";

const SYSTEM_CHANNEL_KEY = "SYSTEM_NEWS";

export class AuthStore {
  private sanitizeUsername(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24);
  }

  private buildUsernameSeed(input: { email: string; displayName: string }): string {
    const fromName = this.sanitizeUsername(input.displayName.replace(/\s+/g, "_"));
    if (fromName.length >= 3) {
      return fromName;
    }
    const local = this.sanitizeUsername(input.email.split("@")[0] ?? "user");
    return local.length >= 3 ? local : "user";
  }

  private async ensureUniqueUsername(seed: string): Promise<string> {
    const base = seed.slice(0, 24);
    let candidate = base;
    let attempt = 0;

    while (attempt < 20) {
      const existing = await prisma.user.findUnique({ where: { username: candidate } });
      if (!existing) {
        return candidate;
      }
      attempt += 1;
      const suffix = Math.floor(Math.random() * 9000 + 1000).toString();
      candidate = `${base.slice(0, Math.max(3, 24 - suffix.length - 1))}_${suffix}`;
    }

    return `${base.slice(0, 16)}_${uuid().slice(0, 7)}`;
  }

  private async createUniqueUserCode(): Promise<string> {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const candidate = Math.random().toString(36).slice(2, 8).toUpperCase();
      if (candidate.length < 6) {
        continue;
      }
      const existing = await prisma.user.findUnique({ where: { userCode: candidate } });
      if (!existing) {
        return candidate;
      }
    }
    return uuid().replace(/-/g, "").slice(0, 6).toUpperCase();
  }

  private toDbProvider(provider: CreateUserInput["provider"]): DbAuthProvider {
    return provider === "google" ? "GOOGLE" : "PASSWORD";
  }

  private toDbTokenType(_type: "reset"): DbEmailTokenType {
    return "RESET";
  }

  private fromDbTokenType(_type: DbEmailTokenType): "reset" {
    return "reset";
  }

  private toStoredUser(user: User): StoredUser {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      userCode: user.userCode,
      userHandle: `${user.username}#${user.userCode}`,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? undefined,
      verifiedEmail: user.verifiedEmail,
      provider: user.provider === "GOOGLE" ? "google" : "password",
      passwordHash: user.passwordHash ?? undefined
    };
  }

  async getByEmail(email: string): Promise<StoredUser | undefined> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    return user ? this.toStoredUser(user) : undefined;
  }

  async getById(id: string): Promise<StoredUser | undefined> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? this.toStoredUser(user) : undefined;
  }

  async createUser(input: CreateUserInput): Promise<StoredUser> {
    const seed = input.username ? this.sanitizeUsername(input.username) : this.buildUsernameSeed(input);
    const username = await this.ensureUniqueUsername(seed.length >= 3 ? seed : "user");
    const userCode = await this.createUniqueUserCode();

    const user = await prisma.user.create({
      data: {
        id: uuid(),
        email: input.email.toLowerCase(),
        username,
        userCode,
        displayName: input.displayName,
        provider: this.toDbProvider(input.provider),
        verifiedEmail: input.verifiedEmail,
        passwordHash: input.passwordHash ?? null
      }
    });

    const systemChannel = await prisma.channel.upsert({
      where: {
        systemKey: SYSTEM_CHANNEL_KEY
      },
      update: {},
      create: {
        type: "GROUP",
        name: "Systemnachrichten",
        isSystem: true,
        systemKey: SYSTEM_CHANNEL_KEY,
        postingPolicy: "OWNER_ONLY",
        createdById: user.id,
        memberships: {
          create: {
            userId: user.id,
            role: appConfig.platformOwnerUserId && appConfig.platformOwnerUserId !== user.id ? "MEMBER" : "OWNER"
          }
        }
      },
      select: {
        id: true,
        createdById: true
      }
    });

    await prisma.channelMembership.upsert({
      where: {
        userId_channelId: {
          userId: user.id,
          channelId: systemChannel.id
        }
      },
      update: {},
      create: {
        userId: user.id,
        channelId: systemChannel.id,
        role:
          appConfig.platformOwnerUserId && user.id === appConfig.platformOwnerUserId
            ? "OWNER"
            : systemChannel.createdById === user.id
              ? "OWNER"
              : "MEMBER"
      }
    });

    return this.toStoredUser(user);
  }

  async updateUser(user: StoredUser): Promise<StoredUser> {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl ?? null,
        verifiedEmail: user.verifiedEmail,
        passwordHash: user.passwordHash ?? null,
        provider: this.toDbProvider(user.provider)
      }
    });
    return this.toStoredUser(updated);
  }

  async createEmailToken(record: CreateEmailTokenInput): Promise<string> {
    const token = uuid();
    await prisma.emailToken.create({
      data: {
        token,
        userId: record.userId,
        type: this.toDbTokenType(record.type),
        expiresAt: record.expiresAt
      }
    });
    return token;
  }

  async consumeEmailToken(token: string, type: "reset"): Promise<EmailTokenRecord | undefined> {
    const dbRecord = await prisma.emailToken.findUnique({ where: { token } });
    if (!dbRecord) {
      return undefined;
    }

    if (dbRecord.type !== this.toDbTokenType(type) || dbRecord.expiresAt.getTime() < Date.now()) {
      return undefined;
    }

    await prisma.emailToken.delete({ where: { token } });

    return {
      userId: dbRecord.userId,
      type: this.fromDbTokenType(dbRecord.type),
      expiresAt: dbRecord.expiresAt.getTime()
    };
  }

  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    const normalized = this.sanitizeUsername(username);
    const existing = await prisma.user.findUnique({ where: { username: normalized } });
    if (!existing) {
      return false;
    }
    return existing.id !== excludeUserId;
  }

  normalizeUsername(username: string): string {
    return this.sanitizeUsername(username);
  }
}

export const authStore = new AuthStore();