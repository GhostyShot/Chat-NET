import "dotenv/config";
import path from "node:path";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return normalized;
}

function parseWebOrigins(): string[] {
  const defaults = ["http://localhost:5173", "https://chat-net.tech"];
  const raw = process.env.WEB_ORIGIN;
  if (!raw) {
    return defaults;
  }
  const fromEnv = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set([...fromEnv, ...defaults]));
}

const webOrigins = parseWebOrigins();

function parseGoogleClientIds(): string[] {
  const single = required("GOOGLE_CLIENT_ID", "dev-google-client-id");
  const fromList = (process.env.GOOGLE_CLIENT_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set([single, ...fromList]));
}

const googleClientIds = parseGoogleClientIds();

export const appConfig = {
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  webOrigin: webOrigins[0] ?? required("WEB_ORIGIN", "http://localhost:5173"),
  webOrigins,
  jwtAccessSecret: required("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
  googleClientId: googleClientIds[0],
  googleClientIds,
  googleAllowDevTokens: (process.env.GOOGLE_ALLOW_DEV_TOKENS ?? "true") === "true",
  uploadDir: process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads"),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? ""
};