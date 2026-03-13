import { create } from "zustand";
import { persist } from "zustand/middleware";

export type BadgeId = string;

export interface BadgeDefinition {
  id: BadgeId;
  label: string;
  shortLabel: string;
  style?: "default" | "verified_blue" | "owner_chatnet";
}

export const DEFAULT_BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "owner_chatnet", label: "Owner (Logo + OWNER)", shortLabel: "OWNER", style: "owner_chatnet" },
  { id: "verified_blue", label: "Blauer Haken (X Style)", shortLabel: "✓", style: "verified_blue" },
  { id: "vip", label: "VIP", shortLabel: "VIP" },
  { id: "legend", label: "Legend", shortLabel: "LEGEND" },
  { id: "core_team", label: "Core Team", shortLabel: "TEAM" },
];

interface BadgeState {
  badgeDefinitions: BadgeDefinition[];
  customBadgesByUserId: Record<string, BadgeId[]>;
  badgeTargetUserId: string;
  newBadgeLabel: string;
  newBadgeShortLabel: string;

  setBadgeDefinitions: (defs: BadgeDefinition[]) => void;
  setCustomBadgesByUserId: (map: Record<string, BadgeId[]> | ((prev: Record<string, BadgeId[]>) => Record<string, BadgeId[]>)) => void;
  setBadgeTargetUserId: (id: string) => void;
  setNewBadgeLabel: (label: string) => void;
  setNewBadgeShortLabel: (label: string) => void;
  toggleBadgeForUser: (userId: string, badge: BadgeId) => void;
  reset: () => void;
}

export const useBadgeStore = create<BadgeState>()(
  persist(
    (set) => ({
      badgeDefinitions: DEFAULT_BADGE_DEFINITIONS,
      customBadgesByUserId: {},
      badgeTargetUserId: "",
      newBadgeLabel: "",
      newBadgeShortLabel: "",

      setBadgeDefinitions: (defs) => set({ badgeDefinitions: defs }),
      setCustomBadgesByUserId: (map) =>
        set((state) => ({
          customBadgesByUserId:
            typeof map === "function" ? map(state.customBadgesByUserId) : map,
        })),
      setBadgeTargetUserId: (id) => set({ badgeTargetUserId: id }),
      setNewBadgeLabel: (label) => set({ newBadgeLabel: label }),
      setNewBadgeShortLabel: (label) => set({ newBadgeShortLabel: label }),
      toggleBadgeForUser: (userId, badge) =>
        set((state) => {
          const current = state.customBadgesByUserId[userId] ?? [];
          const hasBadge = current.includes(badge);
          const next = hasBadge
            ? current.filter((b) => b !== badge)
            : [...current, badge];
          if (next.length === 0) {
            const { [userId]: _removed, ...rest } = state.customBadgesByUserId;
            return { customBadgesByUserId: rest };
          }
          return { customBadgesByUserId: { ...state.customBadgesByUserId, [userId]: next } };
        }),
      reset: () =>
        set({
          badgeDefinitions: DEFAULT_BADGE_DEFINITIONS,
          customBadgesByUserId: {},
          badgeTargetUserId: "",
        }),
    }),
    {
      name: "chat-net-badges",
    }
  )
);
