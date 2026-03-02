import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { AuthResponse } from "@chatnet/shared";
import { io, type Socket } from "socket.io-client";
import {
  API_URL,
  addGroupMemberByUsername,
  blockUser,
  createDirectByUsername,
  deleteGroupChannel,
  createGroupChannel,
  deleteMessage,
  forgotPassword,
  getProfile,
  getPresence,
  listChannelMembers,
  listChannels,
  listMessages,
  login,
  loginWithGoogle,
  markRead,
  leaveChannel,
  getPlatformSettings,
  removeChannelMember,
  searchMessages,
  register,
  resetPassword,
  sendMessage,
  transferChannelOwnership,
  setPlatformUploadsEnabled,
  updateChannelMemberRole,
  updateProfile,
  updateMessage,
  uploadFile,
  type ChannelMemberItem,
  type ChannelItem,
  type MessageItem
} from "./lib/api";

type Mode = "login" | "register" | "forgot" | "reset";
type BadgeId = string;
type BadgeDefinition = {
  id: BadgeId;
  label: string;
  shortLabel: string;
  style?: "default" | "verified_blue" | "owner_chatnet";
};

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: "standard";
              theme?: "outline" | "filled_black" | "filled_blue";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "continue_with" | "signup_with";
              shape?: "pill" | "rectangular";
              width?: number;
            }
          ) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GOOGLE_SCRIPT_ID = "google-identity-services";
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const platformOwnerUserId = (import.meta.env.VITE_PLATFORM_OWNER_USER_ID as string | undefined)?.trim();
const PLATFORM_OWNER_FALLBACK_USERNAME = "paul_fmp";
const BADGE_STORAGE_PREFIX = "chat-net-custom-badges";
const AUTH_COOKIE_KEY = "chat_net_auth";
const AUTH_STORAGE_KEY = "chat_net_auth_v1";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const DEFAULT_BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "owner_chatnet", label: "Owner (Logo + OWNER)", shortLabel: "OWNER", style: "owner_chatnet" },
  { id: "verified_blue", label: "Blauer Haken (X Style)", shortLabel: "✓", style: "verified_blue" },
  { id: "vip", label: "VIP", shortLabel: "VIP" },
  { id: "legend", label: "Legend", shortLabel: "LEGEND" },
  { id: "core_team", label: "Core Team", shortLabel: "TEAM" }
];

function readPersistedAuth(): AuthResponse | null {
  if (typeof window === "undefined") {
    return null;
  }

  const tryParse = (raw: string | null): AuthResponse | null => {
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthResponse;
    } catch {
      return null;
    }
  };

  const cookieMatch = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${AUTH_COOKIE_KEY}=`));
  const fromCookie = tryParse(cookieMatch ? decodeURIComponent(cookieMatch.split("=").slice(1).join("=")) : null);
  if (fromCookie) {
    return fromCookie;
  }

  return tryParse(window.localStorage.getItem(AUTH_STORAGE_KEY));
}

function persistAuth(auth: AuthResponse | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!auth) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    document.cookie = `${AUTH_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }

  const payload = JSON.stringify(auth);
  window.localStorage.setItem(AUTH_STORAGE_KEY, payload);
  document.cookie = `${AUTH_COOKIE_KEY}=${encodeURIComponent(payload)}; Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

export function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    const stored = window.localStorage.getItem("chat-net-theme");
    if (stored === "dark" || stored === "light") {
      return stored;
    }
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [token, setToken] = useState("");
  const [resetTokenFromLink, setResetTokenFromLink] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [auth, setAuth] = useState<AuthResponse | null>(() => readPersistedAuth());
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [composerText, setComposerText] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [createChannelModalOpen, setCreateChannelModalOpen] = useState(false);
  const [directModalOpen, setDirectModalOpen] = useState(false);
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  const [typingHint, setTypingHint] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageItem[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [directUsername, setDirectUsername] = useState("");
  const [addMemberUsername, setAddMemberUsername] = useState("");
  const [channelMembers, setChannelMembers] = useState<ChannelMemberItem[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const [ownerStudioOpen, setOwnerStudioOpen] = useState(false);
  const [profileNickname, setProfileNickname] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [mentionNotice, setMentionNotice] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoadError, setGoogleLoadError] = useState("");
  const [googleRenderAttempt, setGoogleRenderAttempt] = useState(0);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [showAuthPage, setShowAuthPage] = useState(false);
  const [badgeDefinitions, setBadgeDefinitions] = useState<BadgeDefinition[]>(DEFAULT_BADGE_DEFINITIONS);
  const [customBadgesByUserId, setCustomBadgesByUserId] = useState<Record<string, BadgeId[]>>({});
  const [badgeTargetUserId, setBadgeTargetUserId] = useState("");
  const [newBadgeLabel, setNewBadgeLabel] = useState("");
  const [newBadgeShortLabel, setNewBadgeShortLabel] = useState("");
  const [uploadsEnabledForAll, setUploadsEnabledForAll] = useState(true);
  const [canManagePlatformSettings, setCanManagePlatformSettings] = useState(false);
  const [platformToggleLoading, setPlatformToggleLoading] = useState(false);
  const [unreadByChannelId, setUnreadByChannelId] = useState<Record<string, number>>({});

  const isPlatformOwner = (userId?: string, username?: string) => {
    const normalizedUsername = username?.toLowerCase();
    return Boolean((platformOwnerUserId && userId === platformOwnerUserId) || normalizedUsername === PLATFORM_OWNER_FALLBACK_USERNAME);
  };

  const currentUserIsPlatformOwner = isPlatformOwner(auth?.user.id, auth?.user.username);

  const badgeDefinitionById = useMemo(() => {
    const map = new Map<BadgeId, BadgeDefinition>();
    for (const definition of badgeDefinitions) {
      map.set(definition.id, definition);
    }
    return map;
  }, [badgeDefinitions]);

  const renderPlatformOwnerBadge = (userId?: string, username?: string) => {
    if (!isPlatformOwner(userId, username)) {
      return null;
    }
    return (
      <span className="owner-pill-badge" title="Chat-Net Owner">
        <img src="/chat-net-logo.svg" alt="Chat-Net Owner" className="owner-logo-badge" />
        <span>OWNER</span>
      </span>
    );
  };

  const renderCustomBadges = (userId?: string) => {
    if (!userId) {
      return null;
    }
    const badges = customBadgesByUserId[userId] ?? [];
    if (badges.length === 0) {
      return null;
    }
    return (
      <span className="custom-badge-row">
        {badges.map((badge) => {
          const badgeMeta = badgeDefinitionById.get(badge);
          if (!badgeMeta) {
            return null;
          }
          if (badgeMeta.style === "verified_blue") {
            return (
              <span key={`${userId}-${badge}`} className="custom-badge verified-blue" title={badgeMeta.label}>
                ✓
              </span>
            );
          }
          if (badgeMeta.style === "owner_chatnet") {
            return (
              <span key={`${userId}-${badge}`} className="custom-badge owner-custom" title={badgeMeta.label}>
                <img src="/chat-net-logo.svg" alt="" className="owner-custom-logo" />
                <span>{badgeMeta.shortLabel}</span>
              </span>
            );
          }
          return (
            <span key={`${userId}-${badge}`} className="custom-badge" title={badgeMeta.label}>
              {badgeMeta.shortLabel}
            </span>
          );
        })}
      </span>
    );
  };

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );

  const sortedChannels = useMemo(() => {
    const parseTimestamp = (value?: string) => {
      if (!value) {
        return 0;
      }
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    return [...channels].sort((left, right) => parseTimestamp(right.updatedAt) - parseTimestamp(left.updatedAt));
  }, [channels]);

  const getChannelDisplayName = (channel: ChannelItem | null) => {
    if (!channel) {
      return "Nachrichten";
    }
    if (channel.type === "GROUP") {
      return channel.name ?? "Unbenannt";
    }
    const directPartner = channel.memberships?.find((membership) => membership.user.id !== auth?.user.id)?.user;
    if (directPartner?.username) {
      return `@${directPartner.username}`;
    }
    if (directPartner?.displayName) {
      return directPartner.displayName;
    }
    return channel.name ?? "Direktchat";
  };

  const getChannelTypeLabel = (channel: ChannelItem) => {
    return channel.type === "GROUP" ? "Gruppe" : "Direkt";
  };

  const formatTimeLabel = (value?: string) => {
    if (!value) {
      return "";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return parsed.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const ownMembershipRole = useMemo(() => {
    if (!activeChannel || !auth) {
      return null;
    }
    return activeChannel.memberships?.find((membership) => membership.user.id === auth.user.id)?.role ?? null;
  }, [activeChannel, auth]);

  const canModerateMembers = ownMembershipRole === "OWNER" || ownMembershipRole === "ADMIN";
  const canManageRoles = ownMembershipRole === "OWNER";
  const knownUsers = useMemo(() => {
    const userMap = new Map<string, { id: string; username?: string; displayName: string }>();
    const addUser = (user?: { id: string; username?: string; displayName: string }) => {
      if (!user?.id) {
        return;
      }
      if (!userMap.has(user.id)) {
        userMap.set(user.id, user);
      }
    };

    if (auth?.user) {
      addUser({ id: auth.user.id, username: auth.user.username, displayName: auth.user.displayName });
    }

    for (const channel of channels) {
      for (const membership of channel.memberships ?? []) {
        addUser({
          id: membership.user.id,
          username: membership.user.username,
          displayName: membership.user.displayName
        });
      }
    }

    for (const member of channelMembers) {
      addUser({ id: member.userId, username: member.user.username, displayName: member.user.displayName });
    }

    for (const entry of messages) {
      addUser({ id: entry.sender.id, username: entry.sender.username, displayName: entry.sender.displayName });
    }

    return Array.from(userMap.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [auth?.user, channels, channelMembers, messages]);

  const badgeTargetUser = useMemo(
    () => knownUsers.find((user) => user.id === badgeTargetUserId) ?? null,
    [knownUsers, badgeTargetUserId]
  );
  const memberRoleByUserId = useMemo(() => {
    const roleMap = new Map<string, "OWNER" | "ADMIN" | "MEMBER">();
    for (const membership of activeChannel?.memberships ?? []) {
      roleMap.set(membership.user.id, membership.role);
    }
    return roleMap;
  }, [activeChannel?.memberships]);

  const mentionCandidates = useMemo(() => {
    const candidates = new Map<string, string>();
    const addCandidate = (username?: string, displayName?: string) => {
      if (!username) {
        return;
      }
      const normalized = username.toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/u.test(normalized)) {
        return;
      }
      if (!candidates.has(normalized)) {
        candidates.set(normalized, displayName ?? normalized);
      }
    };

    addCandidate(auth?.user.username, auth?.user.displayName);

    for (const message of messages) {
      addCandidate(message.sender.username, message.sender.displayName);
    }

    for (const membership of activeChannel?.memberships ?? []) {
      addCandidate(membership.user.username, membership.user.displayName);
    }

    return Array.from(candidates.entries()).map(([username, displayName]) => ({ username, displayName }));
  }, [auth?.user.displayName, auth?.user.username, messages, activeChannel?.memberships]);

  const filteredMentionCandidates = useMemo(() => {
    if (mentionQuery === null) {
      return [];
    }
    const normalized = mentionQuery.toLowerCase();
    return mentionCandidates
      .filter((item) => item.username.startsWith(normalized) && item.username !== auth?.user.username)
      .slice(0, 6);
  }, [mentionCandidates, mentionQuery, auth?.user.username]);

  useEffect(() => {
    if (!auth) {
      setProfileNickname("");
      setProfileUsername("");
      return;
    }
    setProfileNickname(auth.user.displayName);
    setProfileUsername(auth.user.username);
  }, [auth]);

  useEffect(() => {
    if (!auth || !currentUserIsPlatformOwner) {
      setBadgeDefinitions(DEFAULT_BADGE_DEFINITIONS);
      setCustomBadgesByUserId({});
      return;
    }
    try {
      const raw = window.localStorage.getItem(`${BADGE_STORAGE_PREFIX}:${auth.user.id}`);
      if (!raw) {
        setBadgeDefinitions(DEFAULT_BADGE_DEFINITIONS);
        setCustomBadgesByUserId({});
        return;
      }
      const parsed: unknown = JSON.parse(raw);

      const isBadgeDefinition = (value: unknown): value is BadgeDefinition => {
        if (!value || typeof value !== "object") {
          return false;
        }
        const candidate = value as Record<string, unknown>;
        return typeof candidate.id === "string" && typeof candidate.label === "string" && typeof candidate.shortLabel === "string";
      };

      const sanitizeAssignments = (value: unknown): Record<string, BadgeId[]> => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          return {};
        }
        const result: Record<string, BadgeId[]> = {};
        for (const [userId, badges] of Object.entries(value)) {
          if (Array.isArray(badges)) {
            result[userId] = badges.filter((badge): badge is BadgeId => typeof badge === "string");
          }
        }
        return result;
      };

      const parsedAsObject = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;

      if (parsedAsObject && ("assignments" in parsedAsObject || "definitions" in parsedAsObject)) {
        const definitionsRaw = Array.isArray(parsedAsObject.definitions)
          ? parsedAsObject.definitions.filter((entry): entry is BadgeDefinition => isBadgeDefinition(entry))
          : DEFAULT_BADGE_DEFINITIONS;
        const mergedDefinitions = [
          ...DEFAULT_BADGE_DEFINITIONS,
          ...definitionsRaw.filter((entry) => !DEFAULT_BADGE_DEFINITIONS.some((base) => base.id === entry.id))
        ];
        setBadgeDefinitions(mergedDefinitions);
        setCustomBadgesByUserId(sanitizeAssignments(parsedAsObject.assignments));
      } else {
        setBadgeDefinitions(DEFAULT_BADGE_DEFINITIONS);
        setCustomBadgesByUserId(sanitizeAssignments(parsed));
      }
    } catch {
      setBadgeDefinitions(DEFAULT_BADGE_DEFINITIONS);
      setCustomBadgesByUserId({});
    }
  }, [auth, currentUserIsPlatformOwner]);

  useEffect(() => {
    if (!auth || !currentUserIsPlatformOwner) {
      return;
    }
    window.localStorage.setItem(
      `${BADGE_STORAGE_PREFIX}:${auth.user.id}`,
      JSON.stringify({ assignments: customBadgesByUserId, definitions: badgeDefinitions })
    );
  }, [auth, customBadgesByUserId, currentUserIsPlatformOwner, badgeDefinitions]);

  useEffect(() => {
    if (!knownUsers.length) {
      setBadgeTargetUserId("");
      return;
    }
    setBadgeTargetUserId((current) => {
      if (current && knownUsers.some((user) => user.id === current)) {
        return current;
      }
      return knownUsers[0]?.id ?? "";
    });
  }, [knownUsers]);

  useEffect(() => {
    const loadPlatformSettings = async () => {
      if (!auth) {
        setUploadsEnabledForAll(true);
        setCanManagePlatformSettings(false);
        return;
      }
      try {
        const settings = await getPlatformSettings(auth.tokens.accessToken);
        setUploadsEnabledForAll(settings.uploadsEnabled);
        setCanManagePlatformSettings(settings.canManage);
      } catch {
        setUploadsEnabledForAll(true);
        setCanManagePlatformSettings(false);
      }
    };

    void loadPlatformSettings();
  }, [auth]);

  const toggleBadgeForUser = (userId: string, badge: BadgeId) => {
    setCustomBadgesByUserId((previous) => {
      const current = previous[userId] ?? [];
      const hasBadge = current.includes(badge);
      const next = hasBadge ? current.filter((entry) => entry !== badge) : [...current, badge];
      if (next.length === 0) {
        const { [userId]: _removed, ...rest } = previous;
        return rest;
      }
      return { ...previous, [userId]: next };
    });
  };

  const createCustomBadge = () => {
    const label = newBadgeLabel.trim();
    const shortLabel = newBadgeShortLabel.trim().toUpperCase();
    if (!label || !shortLabel || shortLabel.length > 10) {
      setMessage("Badge braucht Namen und ein kurzes Label (max. 10 Zeichen).");
      return;
    }
    const id = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
    if (!id || badgeDefinitions.some((entry) => entry.id === id)) {
      setMessage("Badge existiert bereits. Nutze einen anderen Namen.");
      return;
    }

    const newDefinition: BadgeDefinition = { id, label, shortLabel };
    setBadgeDefinitions((previous) => [...previous, newDefinition]);
    if (auth?.user.id) {
      toggleBadgeForUser(auth.user.id, id);
      setBadgeTargetUserId(auth.user.id);
    }
    setNewBadgeLabel("");
    setNewBadgeShortLabel("");
    setMessage("Neues Badge erstellt und dir zugewiesen.");
  };

  const onToggleGlobalUploads = async (enabled: boolean) => {
    if (!auth || !canManagePlatformSettings) {
      return;
    }
    setPlatformToggleLoading(true);
    try {
      await setPlatformUploadsEnabled(auth.tokens.accessToken, enabled);
      setUploadsEnabledForAll(enabled);
      setMessage(enabled ? "Datei-Uploads wurden für alle aktiviert." : "Datei-Uploads wurden für alle deaktiviert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload-Einstellung konnte nicht geändert werden");
    } finally {
      setPlatformToggleLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("chat-net-theme", theme);
  }, [theme]);

  useEffect(() => {
    persistAuth(auth);
  }, [auth]);

  useEffect(() => {
    if (typeof window === "undefined" || auth) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode");
    const resetToken = params.get("token");
    if (modeParam === "reset" && resetToken) {
      setMode("reset");
      setToken(resetToken);
      setResetTokenFromLink(resetToken);
      setShowAuthPage(true);
    }
  }, [auth]);

  useEffect(() => {
    const loadChannels = async () => {
      if (!auth) {
        setChannels([]);
        setActiveChannelId(null);
        return;
      }

      try {
        const list = await listChannels(auth.tokens.accessToken);
        setChannels(list);
        setActiveChannelId((current) => current ?? list[0]?.id ?? null);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Channels konnten nicht geladen werden");
      }
    };

    void loadChannels();
  }, [auth]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!auth) {
        return;
      }
      try {
        const profile = await getProfile(auth.tokens.accessToken);
        setAuth((current) =>
          current
            ? {
                ...current,
                user: {
                  ...current.user,
                  ...profile,
                  avatarUrl: profile.avatarUrl ?? undefined
                }
              }
            : current
        );
      } catch {
        // keep existing auth payload if profile fetch fails
      }
    };

    void loadProfile();
  }, [auth?.tokens.accessToken]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!auth || !activeChannelId) {
        setMessages([]);
        return;
      }

      try {
        const next = await listMessages(auth.tokens.accessToken, activeChannelId);
        setMessages(next.slice().reverse());
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Nachrichten konnten nicht geladen werden");
      }
    };

    void loadMessages();
  }, [auth, activeChannelId]);

  useEffect(() => {
    if (!activeChannelId) {
      return;
    }
    setUnreadByChannelId((previous) => {
      if (!previous[activeChannelId]) {
        return previous;
      }
      const { [activeChannelId]: _removed, ...rest } = previous;
      return rest;
    });
  }, [activeChannelId]);

  useEffect(() => {
    const listElement = messageListRef.current;
    if (!listElement) {
      return;
    }
    listElement.scrollTo({ top: listElement.scrollHeight, behavior: "smooth" });
  }, [messages, activeChannelId]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!auth || !activeChannelId || !activeChannel || activeChannel.type !== "GROUP") {
        setChannelMembers([]);
        return;
      }

      try {
        const members = await listChannelMembers(auth.tokens.accessToken, activeChannelId);
        setChannelMembers(members);
      } catch {
        setChannelMembers([]);
      }
    };

    void loadMembers();
  }, [auth, activeChannelId, activeChannel?.id, activeChannel?.type]);

  useEffect(() => {
    if (!auth) {
      return;
    }

    const socket: Socket = io(API_URL, {
      auth: {
        token: auth.tokens.accessToken
      }
    });
    socketRef.current = socket;

    const onNewMessage = (incoming: MessageItem) => {
      const incomingChannelId = incoming.channelId;
      const isOwnMessage = incoming.sender.id === auth.user.id;
      const isActiveChannel = Boolean(incomingChannelId && incomingChannelId === activeChannelId);

      if (incomingChannelId) {
        setChannels((previous) =>
          previous.map((channel) =>
            channel.id === incomingChannelId
              ? {
                  ...channel,
                  updatedAt: incoming.createdAt || new Date().toISOString()
                }
              : channel
          )
        );
      }

      const ownUsername = auth.user.username?.toLowerCase();
      if (
        ownUsername &&
        !isOwnMessage &&
        incoming.content.toLowerCase().includes(`@${ownUsername}`)
      ) {
        setMentionNotice(`🔔 Mention von ${incoming.sender.displayName}`);
      }

      if (!isActiveChannel && incomingChannelId && !isOwnMessage) {
        setUnreadByChannelId((previous) => ({
          ...previous,
          [incomingChannelId]: (previous[incomingChannelId] ?? 0) + 1
        }));
      }

      if (!isActiveChannel) {
        return;
      }

      setMessages((previous) => {
        if (previous.some((entry) => entry.id === incoming.id)) {
          return previous;
        }
        return [...previous, incoming];
      });
    };

    const onTyping = (payload: { roomId: string; userId: string }) => {
      if (payload.userId === auth.user.id || payload.roomId !== activeChannelId) {
        return;
      }
      setTypingHint("Jemand schreibt gerade...");
      setTimeout(() => setTypingHint(""), 1200);
    };

    const onPresenceUpdate = (payload: { userId: string; online: boolean }) => {
      setPresenceMap((previous) => ({ ...previous, [payload.userId]: payload.online }));
    };

    const onMessageUpdated = (updated: MessageItem) => {
      setMessages((previous) => previous.map((entry) => (entry.id === updated.id ? updated : entry)));
    };

    const onMessageDeleted = (payload: { id: string; deleted: boolean }) => {
      if (!payload.deleted) {
        return;
      }
      setMessages((previous) => previous.filter((entry) => entry.id !== payload.id));
    };

    socket.on("new_message", onNewMessage);
    socket.on("typing", onTyping);
    socket.on("presence_update", onPresenceUpdate);
    socket.on("message_updated", onMessageUpdated);
    socket.on("message_deleted", onMessageDeleted);

    if (activeChannelId) {
      socket.emit("join_room", activeChannelId);
    }

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("typing", onTyping);
      socket.off("presence_update", onPresenceUpdate);
      socket.off("message_updated", onMessageUpdated);
      socket.off("message_deleted", onMessageDeleted);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [auth, activeChannelId]);

  useEffect(() => {
    const loadPresence = async () => {
      if (!auth || messages.length === 0) {
        return;
      }
      const ids = Array.from(new Set(messages.map((item) => item.sender.id)));
      const presence = await getPresence(auth.tokens.accessToken, ids);
      const next = Object.fromEntries(presence.map((item) => [item.userId, item.online]));
      setPresenceMap(next);
    };
    void loadPresence();
  }, [auth, messages]);

  useEffect(() => {
    const markLatestAsRead = async () => {
      if (!auth || !activeChannelId || messages.length === 0) {
        return;
      }
      const latest = messages[messages.length - 1];
      await markRead(auth.tokens.accessToken, activeChannelId, latest.id);
    };
    void markLatestAsRead();
  }, [auth, activeChannelId, messages]);

  useEffect(() => {
    if (auth || !showAuthPage || !!resetTokenFromLink || !googleClientId || !googleButtonRef.current) {
      setGoogleReady(false);
      setGoogleLoadError("");
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const setGoogleUnavailable = () => {
      if (cancelled) {
        return;
      }
      setGoogleReady(false);
      setGoogleLoadError("Google Login ist aktuell nicht verfügbar. Nutze bitte E-Mail Login.");
    };

    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      try {
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response) => {
            if (!response.credential) {
              setMessage("Google Login konnte kein Token liefern.");
              return;
            }

            setLoading(true);
            setMessage("");
            try {
              setAuth(await loginWithGoogle(response.credential));
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Google Login fehlgeschlagen");
            } finally {
              setLoading(false);
            }
          }
        });

        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: theme === "dark" ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320
        });
        window.google.accounts.id.prompt();
        setGoogleLoadError("");
        setGoogleReady(true);
      } catch {
        setGoogleUnavailable();
      }
    };

    timeoutId = window.setTimeout(() => {
      if (!window.google?.accounts?.id) {
        setGoogleUnavailable();
      }
    }, 7000);

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        cancelled = true;
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton);
      existingScript.addEventListener("error", setGoogleUnavailable);
      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", renderGoogleButton);
        existingScript.removeEventListener("error", setGoogleUnavailable);
        if (timeoutId) {
          window.clearTimeout(timeoutId);
        }
      };
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderGoogleButton);
    script.addEventListener("error", setGoogleUnavailable);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", renderGoogleButton);
      script.removeEventListener("error", setGoogleUnavailable);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [auth, theme, showAuthPage, resetTokenFromLink, googleRenderAttempt]);

  const submit = async () => {
    setLoading(true);
    setMessage("");
    try {
      if (mode === "login") {
        setAuth(await login(email, password));
      }
      if (mode === "register") {
        setAuth(await register(email, password, displayName));
      }
      if (mode === "forgot") {
        await forgotPassword(email);
        setMessage("Wenn ein Konto existiert, wurde eine E-Mail mit Reset-Link verschickt.");
      }
      if (mode === "reset") {
        await resetPassword(token, password);
        setMessage("Passwort wurde aktualisiert.");
        if (resetTokenFromLink) {
          setResetTokenFromLink(null);
          window.history.replaceState({}, "", "/");
          setMode("login");
          setToken("");
          setPassword("");
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  };

  const onCreateChannel = async () => {
    if (!auth || !newChannelName.trim()) {
      return;
    }

    try {
      const channel = await createGroupChannel(auth.tokens.accessToken, newChannelName.trim(), []);
      setChannels((previous) => [channel, ...previous]);
      setActiveChannelId(channel.id);
      setNewChannelName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Channel konnte nicht erstellt werden");
    }
  };

  const onSendMessage = async () => {
    if (!auth || !activeChannelId || !composerText.trim()) {
      return;
    }

    try {
      await sendMessage(auth.tokens.accessToken, activeChannelId, composerText.trim());
      setComposerText("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nachricht konnte nicht gesendet werden");
    }
  };

  const onSearch = async () => {
    if (!auth || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await searchMessages(auth.tokens.accessToken, searchQuery.trim(), activeChannelId ?? undefined);
      setSearchResults(results);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Suche fehlgeschlagen");
    }
  };

  const onBlockSender = async (senderId: string) => {
    if (!auth) {
      return;
    }
    try {
      await blockUser(auth.tokens.accessToken, senderId);
      setMessage("User wurde blockiert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Blockieren fehlgeschlagen");
    }
  };

  const onEditMessage = (entry: MessageItem) => {
    setEditingMessageId(entry.id);
    setEditingContent(entry.content);
  };

  const onSaveEdit = async (messageId: string) => {
    if (!auth || !activeChannelId || !editingContent.trim()) {
      return;
    }

    try {
      await updateMessage(auth.tokens.accessToken, activeChannelId, messageId, editingContent.trim());
      setEditingMessageId(null);
      setEditingContent("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bearbeiten fehlgeschlagen");
    }
  };

  const onDeleteMessage = async (messageId: string) => {
    if (!auth || !activeChannelId) {
      return;
    }
    try {
      await deleteMessage(auth.tokens.accessToken, activeChannelId, messageId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Löschen fehlgeschlagen");
    }
  };

  const onUploadSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!auth) {
      return;
    }
    if (!uploadsEnabledForAll) {
      setMessage("Datei-Uploads sind aktuell vom Owner deaktiviert.");
      event.target.value = "";
      return;
    }
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const uploaded = await uploadFile(auth.tokens.accessToken, file);
      setComposerText((previous) => `${previous}${previous ? "\n" : ""}${uploaded.url}`);
      event.target.value = "";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload fehlgeschlagen");
    }
  };

  const updateMentionState = (value: string, caretPosition: number) => {
    const uptoCaret = value.slice(0, caretPosition);
    const match = uptoCaret.match(/(?:^|\s)@([a-z0-9_]*)$/iu);
    if (!match) {
      setMentionQuery(null);
      setMentionIndex(0);
      return;
    }
    setMentionQuery((match[1] ?? "").toLowerCase());
    setMentionIndex(0);
  };

  const insertMention = (username: string) => {
    const textarea = composerRef.current;
    if (!textarea) {
      return;
    }

    const caret = textarea.selectionStart ?? composerText.length;
    const before = composerText.slice(0, caret);
    const after = composerText.slice(caret);
    const replacedBefore = before.replace(/(?:^|\s)@([a-z0-9_]*)$/iu, (full) => {
      const prefix = full.startsWith(" ") ? " " : "";
      return `${prefix}@${username} `;
    });
    const nextValue = `${replacedBefore}${after}`;
    setComposerText(nextValue);
    setMentionQuery(null);

    window.requestAnimationFrame(() => {
      const nextCaret = replacedBefore.length;
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  };

  const onStartDirectByUsername = async () => {
    if (!auth || !directUsername.trim()) {
      return;
    }

    try {
      const channel = await createDirectByUsername(auth.tokens.accessToken, directUsername.trim());
      setChannels((previous) => {
        if (previous.some((entry) => entry.id === channel.id)) {
          return previous;
        }
        return [channel, ...previous];
      });
      setActiveChannelId(channel.id);
      setDirectUsername("");
      setDirectModalOpen(false);
      setMessage("Direktchat wurde erstellt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Direktchat konnte nicht erstellt werden");
    }
  };

  const onAddMemberByUsername = async () => {
    if (!auth || !activeChannelId || !activeChannel || activeChannel.type !== "GROUP" || !addMemberUsername.trim()) {
      return;
    }

    try {
      await addGroupMemberByUsername(auth.tokens.accessToken, activeChannelId, addMemberUsername.trim());
      setAddMemberUsername("");
      setAddMemberModalOpen(false);
      setMessage("Person wurde zur Gruppe hinzugefügt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Person konnte nicht hinzugefügt werden");
    }
  };

  const refreshChannelList = async (preferredChannelId?: string | null) => {
    if (!auth) {
      return;
    }
    const list = await listChannels(auth.tokens.accessToken);
    setChannels(list);
    setActiveChannelId((current) => {
      if (preferredChannelId === null) {
        return list[0]?.id ?? null;
      }
      const desired = preferredChannelId ?? current;
      if (desired && list.some((entry) => entry.id === desired)) {
        return desired;
      }
      return list[0]?.id ?? null;
    });
  };

  const onToggleMemberRole = async (member: ChannelMemberItem) => {
    if (!auth || !activeChannelId || !canManageRoles) {
      return;
    }

    const nextRole = member.role === "ADMIN" ? "member" : "admin";
    try {
      const updated = await updateChannelMemberRole(auth.tokens.accessToken, activeChannelId, member.userId, nextRole);
      setChannelMembers((previous) =>
        previous.map((entry) => (entry.userId === member.userId ? { ...entry, role: updated.role } : entry))
      );
      setMessage(`Rolle von @${member.user.username} wurde aktualisiert.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rolle konnte nicht geändert werden");
    }
  };

  const onRemoveMember = async (member: ChannelMemberItem) => {
    if (!auth || !activeChannelId || !canModerateMembers) {
      return;
    }

    try {
      await removeChannelMember(auth.tokens.accessToken, activeChannelId, member.userId);
      setChannelMembers((previous) => previous.filter((entry) => entry.userId !== member.userId));
      setMessage(`@${member.user.username} wurde entfernt.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mitglied konnte nicht entfernt werden");
    }
  };

  const onTransferOwnership = async (member: ChannelMemberItem) => {
    if (!auth || !activeChannelId || !canManageRoles) {
      return;
    }

    try {
      await transferChannelOwnership(auth.tokens.accessToken, activeChannelId, member.userId);
      const members = await listChannelMembers(auth.tokens.accessToken, activeChannelId);
      setChannelMembers(members);
      await refreshChannelList(activeChannelId);
      setMessage(`Owner wurde an @${member.user.username} übertragen.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Owner konnte nicht übertragen werden");
    }
  };

  const onLeaveGroup = async () => {
    if (!auth || !activeChannelId || !activeChannel || activeChannel.type !== "GROUP") {
      return;
    }

    try {
      await leaveChannel(auth.tokens.accessToken, activeChannelId);
      setChannelMembers([]);
      await refreshChannelList(null);
      setMessage("Du hast die Gruppe verlassen.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gruppe konnte nicht verlassen werden");
    }
  };

  const onDeleteGroup = async () => {
    if (!auth || !activeChannelId || !activeChannel || activeChannel.type !== "GROUP" || ownMembershipRole !== "OWNER") {
      return;
    }

    const confirmed = window.confirm(`Willst du die Gruppe \"${activeChannel.name ?? "Unbenannt"}\" wirklich löschen?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteGroupChannel(auth.tokens.accessToken, activeChannelId);
      setChannelMembers([]);
      await refreshChannelList(null);
      setMessage("Gruppe wurde gelöscht.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gruppe konnte nicht gelöscht werden");
    }
  };

  const openCreateChannelModal = () => {
    setCreateChannelModalOpen(true);
  };

  const onCreateChannelFromModal = async () => {
    if (!auth || !newChannelName.trim()) {
      return;
    }
    await onCreateChannel();
    setCreateChannelModalOpen(false);
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMentionCandidates.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((current) => (current + 1) % filteredMentionCandidates.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex((current) => (current - 1 + filteredMentionCandidates.length) % filteredMentionCandidates.length);
        return;
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        insertMention(filteredMentionCandidates[mentionIndex]?.username ?? filteredMentionCandidates[0].username);
        return;
      }
      if (event.key === "Escape") {
        setMentionQuery(null);
        return;
      }
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void onSendMessage();
    }
  };

  const renderContentWithMentions = (content: string) => {
    const ownUsername = auth?.user.username?.toLowerCase();
    return content.split(/(@[a-z0-9_]{3,24})/gi).map((part, index) => {
      if (!part.startsWith("@")) {
        return <span key={`txt-${index}`}>{part}</span>;
      }
      const token = part.slice(1).toLowerCase();
      const className = ownUsername && token === ownUsername ? "mention-hit" : "mention";
      return (
        <span key={`mention-${index}`} className={className}>
          {part}
        </span>
      );
    });
  };

  const onSaveProfile = async () => {
    if (!auth) {
      return;
    }

    try {
      const profile = await updateProfile(auth.tokens.accessToken, {
        displayName: profileNickname,
        username: profileUsername
      });
      setAuth((current) =>
        current
          ? {
              ...current,
              user: {
                ...current.user,
                ...profile,
                avatarUrl: profile.avatarUrl ?? undefined
              }
            }
          : current
      );
      setMessage("Profil gespeichert.");
      setProfileOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profil konnte nicht gespeichert werden");
    }
  };

  const logout = () => {
    setAuth(null);
    setMessages([]);
    setChannels([]);
    setActiveChannelId(null);
    setSearchResults([]);
    setSearchQuery("");
    setComposerText("");
    setMessage("");
    setMentionNotice("");
  };

  if (auth) {
    return (
      <main className="app-shell chat-app-shell">
        <section className="chat-shell">
          <header className="chat-topbar">
            <div className="brand-block">
              <img src="/chat-net-logo.svg" alt="Chat-Net Logo" className="brand-logo" />
              <p className="eyebrow">chat-net.tech</p>
              <h1>Chat-Net</h1>
              <p className="subtitle">Der sichere Chat für echte Gespräche</p>
            </div>
            <div className="user-block">
              <button
                className="secondary"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? "Hell" : "Dunkel"}
              </button>
              <div className="user-chip">
                <span className="status-dot" />
                <span>
                  {auth.user.displayName}
                  {renderPlatformOwnerBadge(auth.user.id, auth.user.username)}
                  {renderCustomBadges(auth.user.id)}
                  <small className="chip-handle">@{auth.user.username}</small>
                </span>
              </div>
              {currentUserIsPlatformOwner && (
                <button className="secondary" onClick={() => setOwnerStudioOpen((current) => !current)}>
                  Owner Menü
                </button>
              )}
              <button className="secondary" onClick={() => setProfileOpen((current) => !current)}>
                Profil
              </button>
              <button className="secondary" onClick={logout}>
                Abmelden
              </button>
            </div>
          </header>

          {profileOpen && (
            <section className="panel profile-panel">
              <div className="panel-header">
                <h3>Profil</h3>
                <span>{auth.user.userHandle}</span>
              </div>
              <div className="profile-grid">
                <label>
                  Nickname
                  <input
                    value={profileNickname}
                    onChange={(event) => setProfileNickname(event.target.value)}
                    placeholder="Dein Nickname"
                  />
                </label>
                <label>
                  Username
                  <input
                    value={profileUsername}
                    onChange={(event) => setProfileUsername(event.target.value.toLowerCase())}
                    placeholder="discord_style"
                  />
                </label>
                <p className="inline-note">
                  Deine eindeutige ID: <strong>{auth.user.userHandle}</strong>
                </p>
                <button className="primary" onClick={onSaveProfile}>
                  Profil speichern
                </button>
              </div>

            </section>
          )}

          {currentUserIsPlatformOwner && ownerStudioOpen && (
            <section className="panel owner-studio-panel">
              <div className="owner-studio">
                <div className="panel-header owner-studio-header">
                  <h3>Owner-Badge Studio</h3>
                  <span>Owner-Bereich</span>
                </div>
                <label>
                  Badge-Zielperson
                  <select
                    value={badgeTargetUserId}
                    onChange={(event) => setBadgeTargetUserId(event.target.value)}
                    className="owner-studio-select"
                  >
                    {knownUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName} {user.username ? `(@${user.username})` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                {badgeTargetUser && (
                  <div className="owner-studio-badges">
                    {badgeDefinitions.map((badge) => {
                      const active = (customBadgesByUserId[badgeTargetUser.id] ?? []).includes(badge.id);
                      return (
                        <label key={badge.id} className={active ? "badge-toggle active" : "badge-toggle"}>
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleBadgeForUser(badgeTargetUser.id, badge.id)}
                          />
                          <span>{badge.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="owner-studio-create">
                  <p className="inline-note">Eigenes Badge erstellen (wird automatisch dir zugewiesen)</p>
                  <div className="owner-studio-create-grid">
                    <input
                      value={newBadgeLabel}
                      onChange={(event) => setNewBadgeLabel(event.target.value)}
                      placeholder="Badge-Name (z. B. Founder)"
                    />
                    <input
                      value={newBadgeShortLabel}
                      onChange={(event) => setNewBadgeShortLabel(event.target.value)}
                      placeholder="Kurzlabel (z. B. FND)"
                      maxLength={10}
                    />
                    <button className="secondary" onClick={createCustomBadge}>
                      Badge erstellen
                    </button>
                  </div>
                </div>

                {canManagePlatformSettings && (
                  <div className="owner-studio-create">
                    <p className="inline-note">Globale Plattform-Einstellungen</p>
                    <div className="owner-studio-toggle-row">
                      <button
                        className={uploadsEnabledForAll ? "primary" : "secondary"}
                        disabled={platformToggleLoading}
                        onClick={() => onToggleGlobalUploads(true)}
                      >
                        Uploads für alle AN
                      </button>
                      <button
                        className={!uploadsEnabledForAll ? "primary" : "secondary"}
                        disabled={platformToggleLoading}
                        onClick={() => onToggleGlobalUploads(false)}
                      >
                        Uploads für alle AUS
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          <div className="chat-layout">
            <aside className="panel channel-panel">
              <div className="panel-header">
                <h3>Kanäle</h3>
                <span>{channels.length}</span>
              </div>

              <div className="channel-toolbar">
                <button className="secondary compact" onClick={openCreateChannelModal}>
                  Neuer Kanal
                </button>
                <button className="secondary compact" onClick={() => setDirectModalOpen(true)}>
                  Direktchat
                </button>
                {activeChannel?.type === "GROUP" && (
                  <button
                    className="secondary compact"
                    onClick={() => setAddMemberModalOpen(true)}
                    disabled={ownMembershipRole !== "OWNER"}
                  >
                    Person hinzufügen
                  </button>
                )}
              </div>

              {activeChannel?.type === "GROUP" && (
                <div className="member-panel">
                  <div className="panel-header">
                    <h3>Mitglieder</h3>
                    <span>{channelMembers.length}</span>
                  </div>
                  <div className="member-list">
                    {channelMembers.map((member) => {
                      const isSelf = member.userId === auth.user.id;
                      return (
                        <div key={member.userId} className="member-item">
                          <div>
                            <p className="member-name">
                              {member.user.displayName}
                              {renderPlatformOwnerBadge(member.userId, member.user.username)}
                              {renderCustomBadges(member.userId)}
                            </p>
                            <p className="member-meta">
                              @{member.user.username} • {member.role}
                            </p>
                          </div>
                          <div className="member-actions">
                            {canManageRoles && member.role !== "OWNER" && !isSelf && (
                              <button className="secondary compact" onClick={() => onTransferOwnership(member)}>
                                Owner geben
                              </button>
                            )}
                            {canManageRoles && member.role !== "OWNER" && !isSelf && (
                              <button className="secondary compact" onClick={() => onToggleMemberRole(member)}>
                                {member.role === "ADMIN" ? "Zu Member" : "Zu Admin"}
                              </button>
                            )}
                            {canModerateMembers && member.role !== "OWNER" && !isSelf && (
                              <button className="secondary compact" onClick={() => onRemoveMember(member)}>
                                Entfernen
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {!channelMembers.length && <p className="inline-note">Keine Mitgliederdaten verfügbar.</p>}
                  </div>
                  <div className="member-actions member-footer-actions">
                    <button
                      className="secondary compact"
                      onClick={onLeaveGroup}
                      disabled={ownMembershipRole === "OWNER"}
                    >
                      Gruppe verlassen
                    </button>
                    {ownMembershipRole === "OWNER" && (
                      <button className="secondary compact" onClick={onDeleteGroup}>
                        Gruppe löschen
                      </button>
                    )}
                  </div>
                  {ownMembershipRole === "OWNER" && (
                    <p className="inline-note">Übertrage erst den Owner an ein anderes Mitglied, bevor du die Gruppe verlässt.</p>
                  )}
                </div>
              )}

              <div className="channel-items">
                {sortedChannels.map((channel) => {
                  const unreadCount = unreadByChannelId[channel.id] ?? 0;
                  return (
                  <button
                    key={channel.id}
                    className={channel.id === activeChannelId ? "channel-item active" : "channel-item"}
                    onClick={() => setActiveChannelId(channel.id)}
                  >
                    <div className="channel-main">
                      <span className="channel-name">{getChannelDisplayName(channel)}</span>
                      <small className="channel-subline">Letzte Aktivität {formatTimeLabel(channel.updatedAt)}</small>
                    </div>
                    <div className="channel-side">
                      <span className="channel-kind">{getChannelTypeLabel(channel)}</span>
                      {unreadCount > 0 ? <span className="channel-unread">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
                    </div>
                  </button>
                  );
                })}
                {!channels.length && <p className="empty-hint">Noch keine Kanäle vorhanden.</p>}
              </div>
            </aside>

            <section className="panel message-panel">
              <div className="panel-header">
                <h3>{getChannelDisplayName(activeChannel)}</h3>
                <span>{typingHint || "Bereit"}</span>
              </div>

              <div className="search-row">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Nachrichten durchsuchen"
                />
                <button className="secondary" onClick={onSearch}>
                  Suchen
                </button>
              </div>

              {!!searchResults.length && (
                <div className="search-results">
                  {searchResults.slice(0, 5).map((entry) => (
                    <p key={`search-${entry.id}`} className="result-item">
                      <strong>{entry.sender.displayName}:</strong> {entry.content}
                    </p>
                  ))}
                </div>
              )}

              <div className="message-list" ref={messageListRef}>
                {messages.map((entry) => {
                  const ownMessage = entry.sender.id === auth.user.id;
                  const showActions = activeMessageId === entry.id;
                  const isOnline = Boolean(presenceMap[entry.sender.id]);
                  const role = memberRoleByUserId.get(entry.sender.id);
                  const timeLabel = formatTimeLabel(entry.createdAt);
                  return (
                    <article
                      key={entry.id}
                      className={ownMessage ? "message-bubble mine" : "message-bubble"}
                      onClick={() => setActiveMessageId((current) => (current === entry.id ? null : entry.id))}
                    >
                      <div className="message-head">
                        <div className="message-author-line">
                          <p className="message-meta">
                            {entry.sender.displayName}
                            {entry.sender.username ? <span className="message-handle">@{entry.sender.username}</span> : null}
                            {renderPlatformOwnerBadge(entry.sender.id, entry.sender.username)}
                            {renderCustomBadges(entry.sender.id)}
                          </p>
                          <div className="message-badges-row">
                            {role === "ADMIN" ? <span className="role-pill">Admin</span> : null}
                            <span className={isOnline ? "presence-pill online" : "presence-pill offline"}>
                              {isOnline ? "Online" : "Offline"}
                            </span>
                            {timeLabel ? <span className="message-time">{timeLabel}</span> : null}
                          </div>
                        </div>
                      </div>

                      {editingMessageId === entry.id ? (
                        <div className="edit-row">
                          <input
                            value={editingContent}
                            onChange={(event) => setEditingContent(event.target.value)}
                            placeholder="Neue Nachricht"
                          />
                          <button className="primary" onClick={() => onSaveEdit(entry.id)}>
                            Speichern
                          </button>
                        </div>
                      ) : (
                        <p className="message-content">{renderContentWithMentions(entry.content)}</p>
                      )}

                      {entry.content.startsWith("http") && (
                        <a className="file-link" href={entry.content} target="_blank" rel="noreferrer">
                          Datei öffnen
                        </a>
                      )}

                      {ownMessage ? (
                        <div className={showActions ? "message-actions visible" : "message-actions"}>
                          <button className="secondary" onClick={() => onEditMessage(entry)}>
                            Bearbeiten
                          </button>
                          <button className="secondary" onClick={() => onDeleteMessage(entry.id)}>
                            Löschen
                          </button>
                        </div>
                      ) : (
                        <button
                          className={showActions ? "secondary compact message-inline-action visible" : "secondary compact message-inline-action"}
                          onClick={() => onBlockSender(entry.sender.id)}
                        >
                          Blockieren
                        </button>
                      )}
                    </article>
                  );
                })}

                {!messages.length && (
                  <div className="empty-state">
                    <p>Noch keine Nachrichten in diesem Kanal.</p>
                    <span>Starte die Unterhaltung mit deiner ersten Nachricht.</span>
                  </div>
                )}
              </div>

              <div className="composer">
                <label
                  className={uploadsEnabledForAll ? "upload-button" : "upload-button disabled"}
                  htmlFor="upload-input"
                  title="Datei anhängen"
                  aria-label="Datei anhängen"
                >
                  <span className="composer-icon">+</span>
                </label>
                <input
                  id="upload-input"
                  className="file-input"
                  type="file"
                  onChange={onUploadSelected}
                  disabled={!uploadsEnabledForAll}
                />
                <div className="composer-input-wrap">
                  <textarea
                    ref={composerRef}
                    value={composerText}
                    onChange={(event) => {
                      const next = event.target.value;
                      setComposerText(next);
                      updateMentionState(next, event.target.selectionStart ?? next.length);
                      if (auth && activeChannelId && next.trim() && socketRef.current) {
                        socketRef.current.emit("typing", { roomId: activeChannelId, userId: auth.user.id });
                      }
                    }}
                    onKeyDown={onComposerKeyDown}
                    placeholder="Nachricht schreiben (Enter senden, Shift+Enter Zeilenumbruch)"
                  />
                  {mentionQuery !== null && filteredMentionCandidates.length > 0 && (
                    <div className="mention-suggestions">
                      {filteredMentionCandidates.map((item, index) => (
                        <button
                          key={item.username}
                          type="button"
                          className={index === mentionIndex ? "mention-option active" : "mention-option"}
                          onClick={() => insertMention(item.username)}
                        >
                          <span>@{item.username}</span>
                          <small>{item.displayName}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="primary composer-send" onClick={onSendMessage} title="Senden" aria-label="Senden">
                  <span className="composer-icon">➤</span>
                </button>
              </div>
            </section>
          </div>

          {message && <p className="message-banner">{message}</p>}
          {mentionNotice && <p className="message-banner mention-banner">{mentionNotice}</p>}

          {createChannelModalOpen && (
            <div className="modal-backdrop" onClick={() => setCreateChannelModalOpen(false)}>
              <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
                <h3>Neuen Kanal erstellen</h3>
                <input
                  value={newChannelName}
                  onChange={(event) => setNewChannelName(event.target.value)}
                  placeholder="Neuer Gruppenchat"
                />
                <div className="modal-actions">
                  <button className="secondary" onClick={() => setCreateChannelModalOpen(false)}>
                    Abbrechen
                  </button>
                  <button className="primary" onClick={onCreateChannelFromModal}>
                    Erstellen
                  </button>
                </div>
              </section>
            </div>
          )}

          {directModalOpen && (
            <div className="modal-backdrop" onClick={() => setDirectModalOpen(false)}>
              <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
                <h3>Direktchat starten</h3>
                <input
                  value={directUsername}
                  onChange={(event) => setDirectUsername(event.target.value.toLowerCase())}
                  placeholder="@username"
                  type="text"
                />
                <div className="modal-actions">
                  <button className="secondary" onClick={() => setDirectModalOpen(false)}>
                    Abbrechen
                  </button>
                  <button className="primary" onClick={onStartDirectByUsername}>
                    Starten
                  </button>
                </div>
              </section>
            </div>
          )}

          {addMemberModalOpen && (
            <div className="modal-backdrop" onClick={() => setAddMemberModalOpen(false)}>
              <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
                <h3>Person zu {getChannelDisplayName(activeChannel)} hinzufügen</h3>
                <input
                  value={addMemberUsername}
                  onChange={(event) => setAddMemberUsername(event.target.value.toLowerCase())}
                  placeholder="@username"
                  type="text"
                />
                <p className="inline-note">Nur Owner können neue Mitglieder hinzufügen.</p>
                <div className="modal-actions">
                  <button className="secondary" onClick={() => setAddMemberModalOpen(false)}>
                    Abbrechen
                  </button>
                  <button className="primary" onClick={onAddMemberByUsername}>
                    Hinzufügen
                  </button>
                </div>
              </section>
            </div>
          )}
        </section>
      </main>
    );
  }

  if (!resetTokenFromLink && !showAuthPage) {
    return (
      <main className="app-shell landing-shell">
        <section className="landing-page">
          <header className="landing-topbar">
            <div className="landing-brand">
              <img src="/chat-net-logo.svg" alt="Chat-Net Logo" className="landing-logo" />
              <div>
                <p className="eyebrow">chat-net.tech</p>
                <h1>Chat-Net</h1>
              </div>
            </div>
            <div className="landing-auth-actions">
              <button
                className="secondary compact"
                onClick={() => {
                  setMode("login");
                  setShowAuthPage(true);
                }}
              >
                Login
              </button>
              <button
                className="primary compact"
                onClick={() => {
                  setMode("register");
                  setShowAuthPage(true);
                }}
              >
                Registrieren
              </button>
            </div>
          </header>

          <div className="landing-hero">
            <p className="eyebrow">Warum Chat-Net?</p>
            <h2>Ein moderner Chat für Communities, Teams und Gamer.</h2>
            <p className="subtitle">
              Schneller Realtime-Chat, starke Gruppenfeatures, klare Rollen und ein UX, das sich wie eine moderne
              Community-Plattform anfühlt.
            </p>
          </div>

          <div className="landing-visual-strip" aria-hidden="true">
            <article className="landing-visual-card">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1200&q=80"
                alt=""
                loading="lazy"
              />
              <p>Glow Feed</p>
            </article>
            <article className="landing-visual-card">
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80"
                alt=""
                loading="lazy"
              />
              <p>Neon Pulse</p>
            </article>
            <article className="landing-visual-card">
              <img
                src="https://images.unsplash.com/photo-1497215842964-222b430dc094?auto=format&fit=crop&w=1200&q=80"
                alt=""
                loading="lazy"
              />
              <p>Frost View</p>
            </article>
          </div>

          <div className="landing-feature-grid">
            <article className="landing-feature-card">
              <h3>Realtime by Default</h3>
              <p>Tippindikatoren, Presence, Read Receipts und direkte Antworten ohne Page-Reload.</p>
            </article>
            <article className="landing-feature-card">
              <h3>Community-Fokus</h3>
              <p>Owner/Admin-Moderation, Gruppenverwaltung, Mentions und klare Rollenstruktur.</p>
            </article>
            <article className="landing-feature-card">
              <h3>Modernes Interface</h3>
              <p>Dark/Light Themes, cleaner Glas-Look und mobile + web konsistent aus einem Guss.</p>
            </article>
          </div>

          <div className="landing-store-row">
            <a
              href="#"
              className="store-badge"
              onClick={(event) => event.preventDefault()}
              aria-label="App Store Coming soon"
            >
              <span className="store-badge-label">Download on the</span>
              <strong>App Store</strong>
              <span className="store-soon">Coming soon</span>
            </a>
            <a
              href="#"
              className="store-badge"
              onClick={(event) => event.preventDefault()}
              aria-label="Google Play Coming soon"
            >
              <span className="store-badge-label">Get it on</span>
              <strong>Google Play</strong>
              <span className="store-soon">Coming soon</span>
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell auth-shell">
      <section className={resetTokenFromLink ? "auth-card reset-card" : "auth-card"}>
        <div className="auth-brand">
          <img src="/chat-net-logo.svg" alt="Chat-Net Logo" className="auth-logo" />
          <p className="eyebrow">chat-net.tech</p>
          <h1>Chat-Net</h1>
          <p className="subtitle">Schnell, klar, modern – dein Space für Chats und Communities.</p>
        </div>

        <div className="auth-panel">
          {resetTokenFromLink ? (
            <>
              <h3>Neues Passwort vergeben</h3>
              <p className="hint">Lege jetzt dein neues Passwort fest.</p>
              <label>
                Neues Passwort
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mindestens 8 Zeichen"
                />
              </label>
              <button onClick={submit} disabled={loading} className="primary wide">
                {loading ? "Lädt..." : "Passwort speichern"}
              </button>
              <button
                className="secondary wide"
                onClick={() => {
                  setResetTokenFromLink(null);
                  window.history.replaceState({}, "", "/");
                  setMode("login");
                  setToken("");
                }}
              >
                Zurück zum Login
              </button>
              {message && <p className="message-banner">{message}</p>}
            </>
          ) : (
            <>
          <div className="mode-tabs">
            <button className={mode === "login" ? "tab active" : "tab"} onClick={() => setMode("login")}>
              Login
            </button>
            <button className={mode === "register" ? "tab active" : "tab"} onClick={() => setMode("register")}>
              Registrieren
            </button>
            <button className={mode === "forgot" ? "tab active" : "tab"} onClick={() => setMode("forgot")}>
              Passwort vergessen
            </button>
          </div>

          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <label>
              E-Mail
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="name@email.de"
              />
            </label>
          )}

          {(mode === "login" || mode === "register") && (
            <label>
              Passwort
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="Mindestens 8 Zeichen"
              />
            </label>
          )}

          {mode === "register" && (
            <label>
              Anzeigename
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                type="text"
                placeholder="Dein Name"
              />
            </label>
          )}

          {mode === "reset" && (
            <label>
              Token
              <input value={token} onChange={(event) => setToken(event.target.value)} type="text" placeholder="Token" />
            </label>
          )}

          <button onClick={submit} disabled={loading} className="primary wide">
            {loading ? "Lädt..." : "Absenden"}
          </button>

          <div className="auth-divider">
            <span>oder</span>
          </div>

          {googleClientId ? (
            <>
              <div ref={googleButtonRef} className="google-button-slot" />
              {!googleReady && !googleLoadError && <p className="hint">Google Login wird geladen...</p>}
              {!googleReady && googleLoadError && (
                <div className="google-fallback">
                  <p className="hint">{googleLoadError}</p>
                  <button className="secondary compact" onClick={() => setGoogleRenderAttempt((current) => current + 1)}>
                    Erneut versuchen
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="hint">Setze in Vercel zusätzlich `VITE_GOOGLE_CLIENT_ID`, um Google Login zu aktivieren.</p>
          )}

          {message && <p className="message-banner">{message}</p>}
            </>
          )}
        </div>
      </section>
    </main>
  );
}