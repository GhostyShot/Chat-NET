import type {
  BattleLog,
  Brawler,
  Club,
  ClubMember,
  EventRotation,
  PlayerProfile,
  Rankings,
} from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const PROXY = `${BASE_URL}/brawlstars`;

export class BrawlApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BrawlApiError';
  }
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${PROXY}${path}`);
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string; reason?: string };
      message = body.message ?? body.reason ?? message;
    } catch {
      // ignore parse errors
    }
    throw new BrawlApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

function encodeTag(tag: string): string {
  const normalised = tag.startsWith('#') ? tag.slice(1) : tag;
  return encodeURIComponent(`%23${normalised.toUpperCase()}`);
}

export function getPlayer(tag: string): Promise<PlayerProfile> {
  return request<PlayerProfile>(`/players/${encodeTag(tag)}`);
}

export function getBattleLog(tag: string): Promise<BattleLog> {
  return request<BattleLog>(`/players/${encodeTag(tag)}/battlelog`);
}

export function getBrawlers(): Promise<{ items: Brawler[] }> {
  return request<{ items: Brawler[] }>('/brawlers');
}

export function getBrawler(id: number): Promise<Brawler> {
  return request<Brawler>(`/brawlers/${id}`);
}

export function getClub(tag: string): Promise<Club> {
  return request<Club>(`/clubs/${encodeTag(tag)}`);
}

export function getClubMembers(tag: string): Promise<{ items: ClubMember[] }> {
  return request<{ items: ClubMember[] }>(`/clubs/${encodeTag(tag)}/members`);
}

export function getPlayerRankings(countryCode = 'global'): Promise<Rankings> {
  return request<Rankings>(`/rankings/${countryCode}/players`);
}

export function getClubRankings(countryCode = 'global'): Promise<Rankings> {
  return request<Rankings>(`/rankings/${countryCode}/clubs`);
}

export function getBrawlerRankings(
  countryCode = 'global',
  brawlerId: number,
): Promise<Rankings> {
  return request<Rankings>(`/rankings/${countryCode}/brawlers/${brawlerId}`);
}

export function getEventRotation(): Promise<EventRotation[]> {
  return request<EventRotation[]>('/events/rotation');
}
