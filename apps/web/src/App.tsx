import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { AuthResponse } from "@chatnet/shared";
import {
  addGroupMemberByUsername,
  blockUser,
  createDirectByUsername,
  deleteGroupChannel,
  createGroupChannel,
  deleteMessage,
  forgotPassword,
  listChannelMembers,
  listChannels,
  login,
  loginWithGoogle,
  leaveChannel,
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
import { AuthCard } from "./components/AuthCard";
import { ChatLayout } from "./components/ChatLayout";
import { LandingPage } from "./components/LandingPage";
import { useChatDataSync } from "./hooks/useChatDataSync";
import { usePersistentAuth } from "./hooks/usePersistentAuth";
import { useRealtimeChat } from "./hooks/useRealtimeChat";
import { useResponsiveChatLayout } from "./hooks/useResponsiveChatLayout";
import { useThemePreference } from "./hooks/useThemePreference";

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
const DEFAULT_BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "owner_chatnet", label: "Owner (Logo + OWNER)", shortLabel: "OWNER", style: "owner_chatnet" },
  { id: "verified_blue", label: "Blauer Haken (X Style)", shortLabel: "✓", style: "verified_blue" },
  { id: "vip", label: "VIP", shortLabel: "VIP" },
  { id: "legend", label: "Legend", shortLabel: "LEGEND" },
  { id: "core_team", label: "Core Team", shortLabel: "TEAM" }
];

export function App() {
  const [theme, setTheme] = useThemePreference();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [token, setToken] = useState("");
  const [resetTokenFromLink, setResetTokenFromLink] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [auth, setAuth] = usePersistentAuth();
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"profile" | "owner">("profile");
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
  const [realtimeState, setRealtimeState] = useState<"connecting" | "online" | "offline">("offline");
  const [unreadByChannelId, setUnreadByChannelId] = useState<Record<string, number>>({});
  const { isMobileLayout, mobilePane, setMobilePane } = useResponsiveChatLayout(activeChannelId, composerRef);

  const socketRef = useRealtimeChat({
    auth,
    activeChannelId,
    setChannels,
    setMessages,
    setUnreadByChannelId,
    setMentionNotice,
    setPresenceMap,
    setTypingHint,
    setRealtimeState
  });

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

  const activeDirectPartner = useMemo(() => {
    if (!activeChannel || activeChannel.type !== "DIRECT") {
      return null;
    }
    return activeChannel.memberships?.find((membership) => membership.user.id !== auth?.user.id)?.user ?? null;
  }, [activeChannel, auth?.user.id]);

  useChatDataSync({
    auth,
    activeChannelId,
    activeChannelType: activeChannel?.type,
    messages,
    setAuth,
    setMessage,
    setChannels,
    setMessages,
    setChannelMembers,
    setPresenceMap,
    setUnreadByChannelId,
    setUploadsEnabledForAll,
    setCanManagePlatformSettings,
    setRealtimeState
  });

  const activeConversationStatus = useMemo(() => {
    if (typingHint) {
      return typingHint;
    }
    if (!activeChannel) {
      return "Bereit";
    }
    if (activeChannel.type === "DIRECT") {
      if (!activeDirectPartner?.id) {
        return "Offline";
      }
      return presenceMap[activeDirectPartner.id] ? "Online" : "Offline";
    }
    const onlineCount = (activeChannel.memberships ?? []).filter((member) => presenceMap[member.user.id]).length;
    return `${onlineCount} online`;
  }, [typingHint, activeChannel, activeDirectPartner?.id, presenceMap]);

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

  const openChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    if (isMobileLayout) {
      setMobilePane("chat");
    }
  };

  useEffect(() => {
    setActiveChannelId((current) => {
      if (channels.length === 0) {
        return null;
      }
      if (current && channels.some((channel) => channel.id === current)) {
        return current;
      }
      return channels[0]?.id ?? null;
    });
  }, [channels]);

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
    const listElement = messageListRef.current;
    if (!listElement) {
      return;
    }
    listElement.scrollTo({ top: listElement.scrollHeight, behavior: "smooth" });
  }, [messages, activeChannelId]);

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
      openChannel(channel.id);
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
      openChannel(channel.id);
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

  const onComposerChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    setComposerText(next);
    updateMentionState(next, event.target.selectionStart ?? next.length);
    if (auth && activeChannelId && next.trim() && socketRef.current) {
      socketRef.current.emit("typing", { roomId: activeChannelId, userId: auth.user.id });
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
      setSettingsOpen(false);
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
      <ChatLayout
        auth={auth}
        theme={theme}
        onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        onLogout={logout}
        realtimeState={realtimeState}
        currentUserIsPlatformOwner={currentUserIsPlatformOwner}
        renderPlatformOwnerBadge={renderPlatformOwnerBadge}
        renderCustomBadges={renderCustomBadges}
        isMobileLayout={isMobileLayout}
        mobilePane={mobilePane}
        setMobilePane={setMobilePane}
        channels={channels}
        sortedChannels={sortedChannels}
        activeChannel={activeChannel}
        activeChannelId={activeChannelId}
        ownMembershipRole={ownMembershipRole}
        channelMembers={channelMembers}
        canManageRoles={canManageRoles}
        canModerateMembers={canModerateMembers}
        onOpenCreateChannelModal={openCreateChannelModal}
        onOpenDirectModal={() => setDirectModalOpen(true)}
        onOpenAddMemberModal={() => setAddMemberModalOpen(true)}
        openChannel={openChannel}
        getChannelDisplayName={getChannelDisplayName}
        getChannelTypeLabel={getChannelTypeLabel}
        formatTimeLabel={formatTimeLabel}
        unreadByChannelId={unreadByChannelId}
        onTransferOwnership={onTransferOwnership}
        onToggleMemberRole={onToggleMemberRole}
        onRemoveMember={onRemoveMember}
        onLeaveGroup={onLeaveGroup}
        onDeleteGroup={onDeleteGroup}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={onSearch}
        searchResults={searchResults}
        activeConversationStatus={activeConversationStatus}
        messages={messages}
        messageListRef={messageListRef}
        activeMessageId={activeMessageId}
        setActiveMessageId={setActiveMessageId}
        presenceMap={presenceMap}
        memberRoleByUserId={memberRoleByUserId}
        editingMessageId={editingMessageId}
        editingContent={editingContent}
        setEditingContent={setEditingContent}
        onSaveEdit={onSaveEdit}
        onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage}
        onBlockSender={onBlockSender}
        renderContentWithMentions={renderContentWithMentions}
        composerText={composerText}
        composerRef={composerRef}
        onComposerChange={onComposerChange}
        onComposerKeyDown={onComposerKeyDown}
        mentionQuery={mentionQuery}
        filteredMentionCandidates={filteredMentionCandidates}
        mentionIndex={mentionIndex}
        insertMention={insertMention}
        onSendMessage={onSendMessage}
        uploadsEnabledForAll={uploadsEnabledForAll}
        onUploadSelected={onUploadSelected}
        message={message}
        mentionNotice={mentionNotice}
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        profileNickname={profileNickname}
        setProfileNickname={setProfileNickname}
        profileUsername={profileUsername}
        setProfileUsername={setProfileUsername}
        onSaveProfile={onSaveProfile}
        knownUsers={knownUsers}
        badgeTargetUserId={badgeTargetUserId}
        setBadgeTargetUserId={setBadgeTargetUserId}
        badgeTargetUser={badgeTargetUser}
        badgeDefinitions={badgeDefinitions}
        customBadgesByUserId={customBadgesByUserId}
        toggleBadgeForUser={toggleBadgeForUser}
        newBadgeLabel={newBadgeLabel}
        setNewBadgeLabel={setNewBadgeLabel}
        newBadgeShortLabel={newBadgeShortLabel}
        setNewBadgeShortLabel={setNewBadgeShortLabel}
        createCustomBadge={createCustomBadge}
        canManagePlatformSettings={canManagePlatformSettings}
        uploadsEnabled={uploadsEnabledForAll}
        platformToggleLoading={platformToggleLoading}
        onToggleGlobalUploads={onToggleGlobalUploads}
        createChannelModalOpen={createChannelModalOpen}
        setCreateChannelModalOpen={setCreateChannelModalOpen}
        newChannelName={newChannelName}
        setNewChannelName={setNewChannelName}
        onCreateChannelFromModal={onCreateChannelFromModal}
        directModalOpen={directModalOpen}
        setDirectModalOpen={setDirectModalOpen}
        directUsername={directUsername}
        setDirectUsername={setDirectUsername}
        onStartDirectByUsername={onStartDirectByUsername}
        addMemberModalOpen={addMemberModalOpen}
        setAddMemberModalOpen={setAddMemberModalOpen}
        addMemberUsername={addMemberUsername}
        setAddMemberUsername={setAddMemberUsername}
        onAddMemberByUsername={onAddMemberByUsername}
      />
    );
  }

  if (!resetTokenFromLink && !showAuthPage) {
    return (
      <LandingPage
        onOpenLogin={() => {
          setMode("login");
          setShowAuthPage(true);
        }}
        onOpenRegister={() => {
          setMode("register");
          setShowAuthPage(true);
        }}
      />
    );
  }

  return (
    <AuthCard
      resetTokenFromLink={resetTokenFromLink}
      mode={mode}
      setMode={setMode}
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      displayName={displayName}
      setDisplayName={setDisplayName}
      token={token}
      setToken={setToken}
      submit={submit}
      loading={loading}
      message={message}
      googleClientId={googleClientId}
      googleButtonRef={googleButtonRef}
      googleReady={googleReady}
      googleLoadError={googleLoadError}
      onRetryGoogleRender={() => setGoogleRenderAttempt((current) => current + 1)}
      onBackToLoginFromReset={() => {
        setResetTokenFromLink(null);
        window.history.replaceState({}, "", "/");
        setMode("login");
        setToken("");
      }}
    />
  );
}