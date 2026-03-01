import { OAuth2Client } from "google-auth-library";
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
      throw new Error("INVALID_GOOGLE_TOKEN");
    }

    return {
      email: `${idToken.slice(4)}@google.user.chat-net.tech`.toLowerCase(),
      displayName: "Chat-Net User",
      verifiedEmail: true
    };
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: appConfig.googleClientIds
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      throw new Error("INVALID_GOOGLE_TOKEN_EMAIL");
    }

    if (!payload.email_verified) {
      throw new Error("INVALID_GOOGLE_TOKEN_UNVERIFIED_EMAIL");
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
      throw new Error("INVALID_GOOGLE_TOKEN_AUDIENCE");
    }
    throw new Error("INVALID_GOOGLE_TOKEN");
  }
}