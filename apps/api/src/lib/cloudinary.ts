/**
 * cloudinary.ts — Upload via base64 URLSearchParams.
 * No Blob/ArrayBuffer — zero TS type issues.
 */
import { appConfig } from "../config.js";
import crypto from "node:crypto";

type ResourceType = "image" | "video" | "raw";

function resourceType(mime: string): ResourceType {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return "video";
  return "raw";
}

/**
 * Core upload: Buffer → base64 data URI → Cloudinary signed upload.
 * signedParams: params that go INTO the signature (must be sorted).
 * extraBodyParams: params sent in body but NOT signed (e.g. transformation).
 */
async function cloudinaryUpload(
  buffer: Buffer,
  mime: string,
  signedParams: Record<string, string>,
  extraBodyParams: Record<string, string> = {}
): Promise<string> {
  const cloud  = appConfig.cloudinaryCloud;
  const key    = appConfig.cloudinaryKey;
  const secret = appConfig.cloudinarySecret;
  if (!cloud || !key || !secret) throw new Error("CLOUDINARY_NOT_CONFIGURED");

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const allSigned = { ...signedParams, timestamp };

  // Signature: alphabetically sorted key=value pairs + secret
  const sigStr = Object.keys(allSigned)
    .sort()
    .map((k) => `${k}=${allSigned[k]}`)
    .join("&") + secret;
  const signature = crypto.createHash("sha1").update(sigStr).digest("hex");

  const dataUri = `data:${mime};base64,${buffer.toString("base64")}`;

  const body = new URLSearchParams({
    file:      dataUri,
    api_key:   key,
    timestamp,
    signature,
    ...allSigned,
    ...extraBodyParams,   // NOT in signature (e.g. transformation)
  });

  const rType = resourceType(mime);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/${rType}/upload`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[cloudinary] ${res.status} ${text.slice(0, 300)}`);
    throw new Error("CLOUDINARY_UPLOAD_FAILED");
  }

  return ((await res.json()) as { secure_url: string }).secure_url;
}

/**
 * Upload avatar. Transformation is NOT signed (correct Cloudinary behaviour).
 * Falls back to base64 data-URI in DB if Cloudinary is not configured.
 */
export async function uploadAvatar(buffer: Buffer, mime: string, userId: string): Promise<string> {
  if (!appConfig.cloudinaryCloud || !appConfig.cloudinaryKey || !appConfig.cloudinarySecret) {
    return `data:${mime};base64,${buffer.toString("base64")}`;
  }
  return cloudinaryUpload(
    buffer, mime,
    { folder: "avatars", public_id: `avatar_${userId}`, overwrite: "true" },
    { transformation: "c_fill,g_face,h_200,q_auto,r_max,w_200" }   // NOT signed
  );
}

/**
 * Upload a chat file (image, video, audio, document).
 */
export async function uploadChatFile(buffer: Buffer, mime: string, originalname: string): Promise<string> {
  const safe     = originalname.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const publicId = `${Date.now()}_${safe}`;
  return cloudinaryUpload(buffer, mime, { folder: "chat_net_uploads", public_id: publicId });
}
