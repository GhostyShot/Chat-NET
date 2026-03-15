export interface StarPower {
  id: number;
  name: string;
}

export interface Gadget {
  id: number;
  name: string;
}

export interface BrawlerStat {
  id: number;
  name: string;
  power: number;
  rank: number;
  trophies: number;
  highestTrophies: number;
  starPowers: StarPower[];
  gadgets: Gadget[];
}

export interface PlayerProfile {
  tag: string;
  name: string;
  nameColor: string;
  icon: { id: number };
  trophies: number;
  highestTrophies: number;
  expLevel: number;
  expPoints: number;
  isQualifiedFromChampionshipChallenge: boolean;
  '3vs3Victories': number;
  soloVictories: number;
  duoVictories: number;
  bestRoboRumbleTime: number;
  bestTimeAsBigBrawler: number;
  club: {
    tag: string;
    name: string;
  };
  brawlers: BrawlerStat[];
}

export interface BattleLogEntry {
  battleTime: string;
  event: {
    id: number;
    mode: string;
    map: string;
  };
  battle: {
    mode: string;
    type: string;
    result?: string;
    trophyChange?: number;
    starPlayer?: {
      tag: string;
      name: string;
      brawler: { id: number; name: string; power: number; trophies: number };
    };
    teams?: Array<
      Array<{
        tag: string;
        name: string;
        brawler: { id: number; name: string; power: number; trophies: number };
      }>
    >;
    players?: Array<{
      tag: string;
      name: string;
      brawler: { id: number; name: string; power: number; trophies: number };
    }>;
  };
}

export interface BattleLog {
  items: BattleLogEntry[];
}

export interface ClubMember {
  tag: string;
  name: string;
  role: string;
  trophies: number;
  icon: { id: number };
}

export interface Club {
  tag: string;
  name: string;
  description: string;
  type: string;
  badgeId: number;
  trophies: number;
  requiredTrophies: number;
  members: ClubMember[];
}

export interface Brawler {
  id: number;
  name: string;
  starPowers: StarPower[];
  gadgets: Gadget[];
}

export interface EventRotation {
  event: {
    id: number;
    mode: string;
    map: {
      id: number;
      name: string;
      scrapLink: string;
    };
  };
  startTime: string;
  endTime: string;
  slotId: number;
}

export interface RankingPlayer {
  tag: string;
  name: string;
  nameColor: string;
  icon: { id: number };
  trophies: number;
  rank: number;
  club?: { name: string };
}

export interface Rankings {
  items: RankingPlayer[];
}

export interface EsportsTeam {
  id: string;
  name: string;
  region: string;
  players: string[];
  wins: number;
  losses: number;
}

export interface EsportsMatch {
  id: string;
  team1: EsportsTeam;
  team2: EsportsTeam;
  scheduledTime: string;
  result?: { winner: string; score: string };
  status: 'upcoming' | 'live' | 'finished';
}
