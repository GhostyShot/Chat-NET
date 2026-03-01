import "dotenv/config";
import path from "node:path";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
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

export const appConfig = {
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  webOrigin: webOrigins[0] ?? required("WEB_ORIGIN", "http://localhost:5173"),
  webOrigins,
  jwtAccessSecret: required("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
  googleClientId: required("GOOGLE_CLIENT_ID", "dev-google-client-id"),
  googleAllowDevTokens: (process.env.GOOGLE_ALLOW_DEV_TOKENS ?? "true") === "true",
  uploadDir: process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads"),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? ""
};