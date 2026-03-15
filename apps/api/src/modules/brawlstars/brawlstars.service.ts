import { appConfig } from "../../config.js";

const BS_API_BASE = "https://api.brawlstars.com/v1";

export class BrawlStarsApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BrawlStarsApiError";
  }
}

async function bsRequest<T>(path: string): Promise<T> {
  const apiKey = appConfig.brawlStarsApiKey;
  if (!apiKey) {
    throw new BrawlStarsApiError(503, "Brawl Stars API key not configured");
  }

  const res = await fetch(`${BS_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    let message = `Brawl Stars API error: ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string; reason?: string };
      message = body.message ?? body.reason ?? message;
    } catch {
      // ignore parse errors
    }
    throw new BrawlStarsApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

function encodeTag(raw: string): string {
  const tag = raw.startsWith("#") ? raw : `#${raw}`;
  return encodeURIComponent(tag.toUpperCase());
}

export const brawlStarsService = {
  getPlayer: (tag: string) => bsRequest<unknown>(`/players/${encodeTag(tag)}`),
  getBattleLog: (tag: string) => bsRequest<unknown>(`/players/${encodeTag(tag)}/battlelog`),
  getBrawlers: () => bsRequest<unknown>("/brawlers"),
  getBrawler: (id: string) => bsRequest<unknown>(`/brawlers/${id}`),
  getClub: (tag: string) => bsRequest<unknown>(`/clubs/${encodeTag(tag)}`),
  getClubMembers: (tag: string) => bsRequest<unknown>(`/clubs/${encodeTag(tag)}/members`),
  getPlayerRankings: (countryCode: string) =>
    bsRequest<unknown>(`/rankings/${countryCode}/players`),
  getClubRankings: (countryCode: string) =>
    bsRequest<unknown>(`/rankings/${countryCode}/clubs`),
  getBrawlerRankings: (countryCode: string, brawlerId: string) =>
    bsRequest<unknown>(`/rankings/${countryCode}/brawlers/${brawlerId}`),
  getEventRotation: () => bsRequest<unknown>("/events/rotation"),
};
