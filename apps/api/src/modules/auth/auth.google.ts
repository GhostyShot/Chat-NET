import { OAuth2Client } from "google-auth-library";
import { config } from "../../config.js";

export interface VerifiedGoogleProfile {
  email: string;
  displayName: string;
  avatarUrl?: string;
  verifiedEmail: boolean;
}

const googleClient = new OAuth2Client(config.googleClientId);

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleProfile> {
  if (idToken.startsWith("dev_")) {
    if (!config.googleAllowDevTokens) {
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
      audience: config.googleClientId
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload.email_verified) {
      throw new Error("INVALID_GOOGLE_TOKEN");
    }

    return {
      email: payload.email.toLowerCase(),
      displayName: payload.name ?? payload.email.split("@")[0] ?? "Chat-Net User",
      avatarUrl: payload.picture,
      verifiedEmail: true
    };
  } catch {
    throw new Error("INVALID_GOOGLE_TOKEN");
  }
}