/**
 * cloudinary.ts — Upload helper using base64 data URI.
 * Avoids all Buffer/Blob/ArrayBuffer TypeScript compatibility issues.
 * Works with both signed and unsigned presets.
 */
import { appConfig } from "../config.js";
import crypto from "node:crypto";

export type CloudinaryResourceType = "image" | "video" | "raw";

function getResourceType(mimetype: string): CloudinaryResourceType {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("video/") || mimetype.startsWith("audio/")) return "video";
  return "raw";
}

/**
 * Upload a Buffer to Cloudinary using base64 encoding.
 * No Blob, no ArrayBuffer — avoids all TS type issues.
 */
export async function uploadBufferToCloudinary(
  buffer: Buffer,
  mimetype: string,
  publicId: string,
  folder: string,
  extraParams: Record<string, string> = {}
): Promise<string> {
  const cloud  = appConfig.cloudinaryCloud;
  const key    = appConfig.cloudinaryKey;
  const secret = appConfig.cloudinarySecret;

  if (!cloud || !key || !secret) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  const resourceType = getResourceType(mimetype);
  const timestamp    = Math.floor(Date.now() / 1000).toString();

  // Build signature params (sorted alphabetically)
  const sigParams: Record<string, string> = {
    folder,
    public_id: publicId,
    timestamp,
    ...extraParams,
  };
  const sigStr = Object.keys(sigParams)
    .sort()
    .map((k) => `${k}=${sigParams[k]}`)
    .join("&") + secret;
  const signature = crypto.createHash("sha1").update(sigStr).digest("hex");

  // Use base64 data URI — no Blob needed
  const base64Data = buffer.toString("base64");
  const dataUri    = `data:${mimetype};base64,${base64Data}`;

  const body = new URLSearchParams({
    file:       dataUri,
    api_key:    key,
    timestamp,
    public_id:  publicId,
    folder,
    signature,
    ...extraParams,
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/upload`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    body.toString(),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[cloudinary] ${res.status}: ${text}`);
    throw new Error("CLOUDINARY_UPLOAD_FAILED");
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}

/**
 * Upload an avatar buffer to Cloudinary with auto-crop transformation.
 * Falls back to base64 data-URI in DB if Cloudinary is not configured.
 */
export async function uploadAvatar(buffer: Buffer, mimetype: string, userId: string): Promise<string> {
  if (!appConfig.cloudinaryCloud || !appConfig.cloudinaryKey || !appConfig.cloudinarySecret) {
    // Fallback: store as data-URI in DB (max 200KB, fine for small user bases)
    return `data:${mimetype};base64,${buffer.toString("base64")}`;
  }

  const publicId = `avatar_${userId}`;
  return uploadBufferToCloudinary(buffer, mimetype, publicId, "avatars", {
    overwrite: "true",
    transformation: "w_200,h_200,c_fill,g_face,r_max,q_auto",
  });
}

/**
 * Upload a chat file buffer to Cloudinary.
 */
export async function uploadChatFile(buffer: Buffer, mimetype: string, originalname: string): Promise<string> {
  const safeName = originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
  const publicId = `${Date.now()}_${safeName}`;
  return uploadBufferToCloudinary(buffer, mimetype, publicId, "chat_net_uploads");
}
