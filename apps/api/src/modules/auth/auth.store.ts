import type { AuthProvider as DbAuthProvider, EmailTokenType as DbEmailTokenType, User } from "@prisma/client";
import { v4 as uuid } from "uuid";
import { prisma } from "../../lib/prisma.js";
import type { CreateEmailTokenInput, CreateUserInput, EmailTokenRecord, StoredUser } from "./auth.types.js";

export class AuthStore {
  private toDbProvider(provider: CreateUserInput["provider"]): DbAuthProvider {
    return provider === "google" ? "GOOGLE" : "PASSWORD";
  }

  private toDbTokenType(type: "verify" | "reset"): DbEmailTokenType {
    return type === "verify" ? "VERIFY" : "RESET";
  }

  private fromDbTokenType(type: DbEmailTokenType): "verify" | "reset" {
    return type === "VERIFY" ? "verify" : "reset";
  }

  private toStoredUser(user: User): StoredUser {
    return {
      id: user.id,
      email: user.email,
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
    const user = await prisma.user.create({
      data: {
        id: uuid(),
        email: input.email.toLowerCase(),
        displayName: input.displayName,
        provider: this.toDbProvider(input.provider),
        verifiedEmail: input.verifiedEmail,
        passwordHash: input.passwordHash ?? null
      }
    });
    return this.toStoredUser(user);
  }

  async updateUser(user: StoredUser): Promise<StoredUser> {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        displayName: user.displayName,
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

  async consumeEmailToken(token: string, type: "verify" | "reset"): Promise<EmailTokenRecord | undefined> {
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
}

export const authStore = new AuthStore();