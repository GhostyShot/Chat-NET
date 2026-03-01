import argon2 from "argon2";
import jwt from "jsonwebtoken";
import type { AuthResponse } from "@chatnet/shared";
import type { StoredUser } from "./auth.types.js";
import { appConfig } from "../../config.js";

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1
  });
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return argon2.verify(passwordHash, password);
}

export function buildAuthResponse(user: StoredUser): AuthResponse {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, provider: user.provider },
    appConfig.jwtAccessSecret,
    { expiresIn: "20m" }
  );
  const refreshToken = jwt.sign(
    { sub: user.id, kind: "refresh" },
    appConfig.jwtRefreshSecret,
    { expiresIn: "14d" }
  );
  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      userCode: user.userCode,
      userHandle: `${user.username}#${user.userCode}`,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      verifiedEmail: user.verifiedEmail
    },
    tokens: {
      accessToken,
      refreshToken
    }
  };
}