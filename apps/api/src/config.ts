import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

function resolveSecretValue(rawValue?: string): string | undefined {
  const normalized = rawValue?.trim();
  if (!normalized) return undefined;
  if (normalized.startsWith("/") && fs.existsSync(normalized)) {
    const fileValue = fs.readFileSync(normalized, "utf8").trim();
    return fileValue || undefined;
  }
  return normalized;
}

function required(name: string, fallback?: string): string {
  const normalized = resolveSecretValue(process.env[name]) ?? resolveSecretValue(fallback);
  if (!normalized) throw new Error(`Missing environment variable: ${name}`);
  return normalized;
}

function parseWebOrigins(): string[] {
  const defaults = ["http://localhost:5173", "https://chat-net.tech"];
  const raw = resolveSecretValue(process.env.WEB_ORIGIN);
  if (!raw) return defaults;
  const fromEnv = raw.split(",").map(v => v.trim()).filter(Boolean);
  return Array.from(new Set([...fromEnv, ...defaults]));
}

function parseGoogleClientIds(): string[] {
  const single = required("GOOGLE_CLIENT_ID", "dev-google-client-id");
  const fromList = (resolveSecretValue(process.env.GOOGLE_CLIENT_IDS) ?? "")
    .split(",").map(v => v.trim()).filter(Boolean);
  return Array.from(new Set([single, ...fromList]));
}

const webOrigins = parseWebOrigins();
const googleClientIds = parseGoogleClientIds();

export const appConfig = {
  port: Number(process.env.PORT ?? process.env.API_PORT ?? 4000),
  webOrigin: webOrigins[0] ?? required("WEB_ORIGIN", "http://localhost:5173"),
  webOrigins,
  webAppUrl: resolveSecretValue(process.env.WEB_APP_URL) ?? webOrigins[0] ?? "http://localhost:5173",
  jwtAccessSecret: required("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
  googleClientId: googleClientIds[0],
  googleClientIds,
  googleStrictAudience: (resolveSecretValue(process.env.GOOGLE_STRICT_AUDIENCE) ?? "false") === "true",
  googleAllowDevTokens: (process.env.GOOGLE_ALLOW_DEV_TOKENS ?? "true") === "true",
  platformOwnerUserId: resolveSecretValue(process.env.PLATFORM_OWNER_USER_ID),
  // Mail — Resend (RESEND_API_KEY) takes priority over SMTP
  resendApiKey: resolveSecretValue(process.env.RESEND_API_KEY),
  smtpHost: resolveSecretValue(process.env.SMTP_HOST),
  smtpPort: Number(resolveSecretValue(process.env.SMTP_PORT) ?? 587),
  smtpSecure: (resolveSecretValue(process.env.SMTP_SECURE) ?? "false") === "true",
  smtpUser: resolveSecretValue(process.env.SMTP_USER),
  smtpPass: resolveSecretValue(process.env.SMTP_PASS),
  smtpFrom: resolveSecretValue(process.env.SMTP_FROM),
  // Cloudinary for avatar uploads (optional)
  cloudinaryUrl: resolveSecretValue(process.env.CLOUDINARY_URL),
  cloudinaryCloud: resolveSecretValue(process.env.CLOUDINARY_CLOUD_NAME),
  cloudinaryKey: resolveSecretValue(process.env.CLOUDINARY_API_KEY),
  cloudinarySecret: resolveSecretValue(process.env.CLOUDINARY_API_SECRET),
  uploadDir: process.env.UPLOAD_DIR ?? path.resolve(process.cwd(), "uploads"),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? process.env.RENDER_EXTERNAL_URL ?? "",
  // Avatar: max 200KB base64 stored in DB if no Cloudinary configured
  avatarMaxBytes: 200 * 1024,
};
