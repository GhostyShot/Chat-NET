import { OAuth2Client } from "google-auth-library";
import { API_ERROR_CODES } from "@chatnet/shared";
import { appConfig } from "../../config.js";

export interface VerifiedGoogleProfile {
  email: string;
  displayName: string;
  avatarUrl?: string;
  verifiedEmail: boolean;
}

const googleClient = new OAuth2Client();

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleProfile> {
  if (idToken.startsWith("dev_")) {
    if (!appConfig.googleAllowDevTokens) {
      throw new Error(API_ERROR_CODES.INVALID_GOOGLE_TOKEN);
    }

    return {
      email: `${idToken.slice(4)}@google.user.chat-net.tech`.toLowerCase(),
      displayName: "Chat-Net User",
      verifiedEmail: true
    };
  }

  try {
    const ticket = appConfig.googleStrictAudience
      ? await googleClient.verifyIdToken({
          idToken,
          audience: appConfig.googleClientIds
        })
      : await googleClient.verifyIdToken({
          idToken
        });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      throw new Error(API_ERROR_CODES.INVALID_GOOGLE_TOKEN_EMAIL);
    }

    if (!payload.email_verified) {
      throw new Error(API_ERROR_CODES.INVALID_GOOGLE_TOKEN_UNVERIFIED_EMAIL);
    }

    return {
      email: payload.email.toLowerCase(),
      displayName: payload.name ?? payload.email.split("@")[0] ?? "Chat-Net User",
      avatarUrl: payload.picture,
      verifiedEmail: true
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Wrong recipient") || message.includes("audience")) {
      throw new Error(API_ERROR_CODES.INVALID_GOOGLE_TOKEN_AUDIENCE);
    }
    throw new Error(API_ERROR_CODES.INVALID_GOOGLE_TOKEN);
  }
}