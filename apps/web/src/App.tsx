import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { AuthResponse } from "@chatnet/shared";
import {
  createPoll,
  forgotPassword,
  listPolls,
  login,
  loginWithGoogle,
  refreshSession,
  register,
  resetPassword,
  sendMessage,
  summarizeChannel,
  uploadFile,
  votePoll,
  type ChannelMemberItem,
  type ChannelItem,
  type MessageItem,
  type PollItem
} from "./lib/api";
import { AuthCard } from "./components/AuthCard";
import { ChatLayout } from "./components/ChatLayout";
import { LandingPage } from "./components/LandingPage";
import { useChatDataSync } from "./hooks/useChatDataSync";
import { useChatActions } from "./hooks/useChatActions";
import { googleClientId, useAuthFlow } from "./hooks/useAuthFlow";
import { usePersistentAuth } from "./hooks/usePersistentAuth";
import { useRealtimeChat } from "./hooks/useRealtimeChat";
import { useVoiceChat } from "./hooks/useVoiceChat";
import { useResponsiveChatLayout } from "./hooks/useResponsiveChatLayout";
import { useThemePreference } from "./hooks/useThemePreference";
import { REALTIME_EVENTS } from "@chatnet/shared";

type Mode = "login" | "register" | "forgot" | "reset";
type BadgeId = string;
type BadgeDefinition = {
  id: BadgeId;
  label: string;
  shortLabel: string;
  style?: "default" | "verified_blue" | "owner_chatnet";
};
const platformOwnerUserId = (import.meta.env.VITE_PLATFORM_OWNER_USER_ID as string | undefined)?.trim();
const PLATFORM_OWNER_FALLBACK_USERNAME = "paul_fmp";
const BADGE_STORAGE_PREFIX = "chat-net-custom-badges";
const DEFAULT_BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: "owner_chatnet", label: "Owner (Logo + OWNER)", shortLabel: "OWNER", style: "owner_chatnet" },
  { id: "verified_blue", label: "Blauer Haken (X Style)", shortLabel: "\u2713", style: "verified_blue" },
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
  const [polls, setPolls] = useState<PollItem[]>([]);
  const [composerText, setComposerText] = useState("");
  const [replyingToMessageId, setReplyingToMessageId] = useState<string | null>(null);
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
  const [voiceNoteState, setVoiceNoteState] = useState<"idle" | "recording" | "uploading">("idle");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [pollLoading, setPollLoading] = useState(false);
  const [sessionRefreshDone, setSessionRefreshDone] = useState(false);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
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

  const { voiceSupported, voiceCallState, voiceParticipants, isVoiceMuted, onStartVoiceCall, onLeaveVoiceCall, onToggleVoiceMute } =
    useVoiceChat({ auth, activeChannelId, socketRef, realtimeState, setMessage });

  const isPlatformOwner = (userId?: string, username?: string) => {
    const normalizedUsername = username?.toLowerCase();
    return Boolean((platformOwnerUserId && userId === platformOwnerUserId) || normalizedUsername === PLATFORM_OWNER_FALLBACK_USERNAME);
  };

  const currentUserIsPlatformOwner = isPlatformOwner(auth?.user.id, auth?.user.username);

  // Session refresh on mount
  useEffect(() => {
    if (!auth || sessionRefreshDone) return;
    let cancelled = false;
    const run = async () => {
      try {
        const refreshed = await refreshSession(auth.tokens.refreshToken);
        if (!cancelled) setAuth(refreshed);
      } catch {
        if (!cancelled) { setAuth(null); setMessage("Sitzung abgelaufen. Bitte neu anmelden."); }
      } finally {
        if (!cancelled) setSessionRefreshDone(true);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [auth, sessionRefreshDone, setAuth]);

  // useChatDataSync now reads from stores directly — no props
  useChatDataSync();

  const badgeDefinitionById = useMemo(() => {
    const map = new Map<BadgeId, BadgeDefinition>();
    for (const def of badgeDefinitions) map.set(def.id, def);
    return map;
  }, [badgeDefinitions]);

  const renderPlatformOwnerBadge = (userId?: string, username?: string) => {
    if (!isPlatformOwner(userId, username)) return null;
    return (
      <span className="owner-pill-badge" title="Chat-Net Owner">
        <img src="/chat-net-logo.svg" alt="" className="owner-logo-badge" />
        <span>OWNER</span>
      </span>
    );
  };

  const renderCustomBadges = (userId?: string) => {
    if (!userId) return null;
    const badges = customBadgesByUserId[userId] ?? [];
    if (!badges.length) return null;
    return (
      <span className="custom-badge-row">
        {badges.map((badge) => {
          const meta = badgeDefinitionById.get(badge);
          if (!meta) return null;
          if (meta.style === "verified_blue")
            return <span key={`${userId}-${badge}`} className="custom-badge verified-blue" title={meta.label}>✓</span>;
          if (meta.style === "owner_chatnet")
            return (
              <span key={`${userId}-${badge}`} className="custom-badge owner-custom" title={meta.label}>
                <img src="/chat-net-logo.svg" alt="" className="owner-custom-logo" />
                <span>{meta.shortLabel}</span>
              </span>
            );
          return <span key={`${userId}-${badge}`} className="custom-badge" title={meta.label}>{meta.shortLabel}</span>;
        })}
      </span>
    );
  };

  const activeChannel = useMemo(
    () => channels.find((c) => c.id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );

  const activeDirectPartner = useMemo(() => {
    if (!activeChannel || activeChannel.type !== "DIRECT") return null;
    return activeChannel.memberships?.find((m) => m.user.id !== auth?.user.id)?.user ?? null;
  }, [activeChannel, auth?.user.id]);

  const activeConversationStatus = useMemo(() => {
    if (typingHint) return typingHint;
    if (!activeChannel) return "Bereit";
    if (activeChannel.type === "DIRECT") {
      if (!activeDirectPartner?.id) return "Offline";
      return presenceMap[activeDirectPartner.id] ? "Online" : "Offline";
    }
    const online = (activeChannel.memberships ?? []).filter((m) => presenceMap[m.user.id]).length;
    return `${online} online`;
  }, [typingHint, activeChannel, activeDirectPartner?.id, presenceMap]);

  const sortedChannels = useMemo(() => {
    const ts = (v?: string) => { if (!v) return 0; const p = Date.parse(v); return isNaN(p) ? 0 : p; };
    return [...channels].sort((a, b) => ts(b.updatedAt) - ts(a.updatedAt));
  }, [channels]);

  const getChannelDisplayName = (channel: ChannelItem | null) => {
    if (!channel) return "Nachrichten";
    if (channel.type === "GROUP") return channel.name ?? "Unbenannt";
    const partner = channel.memberships?.find((m) => m.user.id !== auth?.user.id)?.user;
    return partner?.displayName ?? partner?.username ?? channel.name ?? "Direktchat";
  };

  const getChannelTypeLabel = (channel: ChannelItem) => channel.type === "GROUP" ? "Gruppe" : "Direkt";

  const openChannel = (channelId: string) => {
    setActiveChannelId(channelId);
    if (isMobileLayout) setMobilePane("chat");
  };

  useEffect(() => {
    setActiveChannelId((current) => {
      if (!channels.length) return null;
      if (current && channels.some((c) => c.id === current)) return current;
      return channels[0]?.id ?? null;
    });
  }, [channels]);

  const formatTimeLabel = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const ownMembershipRole = useMemo(() => {
    if (!activeChannel || !auth) return null;
    return activeChannel.memberships?.find((m) => m.user.id === auth.user.id)?.role ?? null;
  }, [activeChannel, auth]);

  const canModerateMembers = ownMembershipRole === "OWNER" || ownMembershipRole === "ADMIN";
  const canManageRoles = ownMembershipRole === "OWNER";

  const knownUsers = useMemo(() => {
    const map = new Map<string, { id: string; username?: string; displayName: string }>();
    const add = (u?: { id: string; username?: string; displayName: string }) => { if (u?.id && !map.has(u.id)) map.set(u.id, u); };
    if (auth?.user) add({ id: auth.user.id, username: auth.user.username, displayName: auth.user.displayName });
    for (const c of channels) for (const m of c.memberships ?? []) add({ id: m.user.id, username: m.user.username, displayName: m.user.displayName });
    for (const m of channelMembers) add({ id: m.userId, username: m.user.username, displayName: m.user.displayName });
    for (const msg of messages) add({ id: msg.sender.id, username: msg.sender.username, displayName: msg.sender.displayName });
    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [auth?.user, channels, channelMembers, messages]);

  const badgeTargetUser = useMemo(() => knownUsers.find((u) => u.id === badgeTargetUserId) ?? null, [knownUsers, badgeTargetUserId]);

  const memberRoleByUserId = useMemo(() => {
    const map = new Map<string, "OWNER" | "ADMIN" | "MEMBER">();
    for (const m of activeChannel?.memberships ?? []) map.set(m.user.id, m.role);
    return map;
  }, [activeChannel?.memberships]);

  const mentionCandidates = useMemo(() => {
    const cands = new Map<string, string>();
    const add = (username?: string, displayName?: string) => {
      if (!username) return;
      const n = username.toLowerCase();
      if (!/^[a-z0-9_]{3,24}$/u.test(n)) return;
      if (!cands.has(n)) cands.set(n, displayName ?? n);
    };
    add(auth?.user.username, auth?.user.displayName);
    for (const msg of messages) add(msg.sender.username, msg.sender.displayName);
    for (const m of activeChannel?.memberships ?? []) add(m.user.username, m.user.displayName);
    return Array.from(cands.entries()).map(([username, displayName]) => ({ username, displayName }));
  }, [auth?.user, messages, activeChannel?.memberships]);

  const filteredMentionCandidates = useMemo(() => {
    if (mentionQuery === null) return [];
    const n = mentionQuery.toLowerCase();
    return mentionCandidates.filter((i) => i.username.startsWith(n) && i.username !== auth?.user.username).slice(0, 6);
  }, [mentionCandidates, mentionQuery, auth?.user.username]);

  useEffect(() => {
    if (!auth) { setProfileNickname(""); setProfileUsername(""); return; }
    setProfileNickname(auth.user.displayName);
    setProfileUsername(auth.user.username);
  }, [auth]);

  useEffect(() => {
    if (!auth || !currentUserIsPlatformOwner) { setBadgeDefinitions(DEFAULT_BADGE_DEFINITIONS); setCustomBadgesByUserId({}); return; }
    try {
      const raw = window.localStorage.getItem(`${BADGE_STORAGE_PREFIX}:${auth.user.id}`);
      if (!raw) { setBadgeDefinitions(DEFAULT_BADGE_DEFINITIONS); setCustomBadgesByUserId({}); return; }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const isBadgeDef = (v: unknown): v is BadgeDefinition =>
        !!v && typeof v === "object" && typeof (v as Record<string,unknown>).id === "string" && typeof (v as Record<string,unknown>).label === "string" && typeof (v as Record<string,unknown>).shortLabel === "string";
      const sanitize = (v: unknown): Record<string, BadgeId[]> => {
        if (!v || typeof v !== "object" || Array.isArray(v)) return {};
        const r: Record<string, BadgeId[]> = {};
        for (const [uid, bs] of Object.entries(v)) if (Array.isArray(bs)) r[uid] = bs.filter((b): b is string => typeof b === "string");
        return r;
      };
      if ("assignments" in parsed || "definitions" in parsed) {
        const defs = Array.isArray(parsed.definitions) ? (parsed.definitions as unknown[]).filter(isBadgeDef) : DEFAULT_BADGE_DEFINITIONS;
        setBadgeDefinitions([...DEFAULT_BADGE_DEFINITIONS, ...defs.filter((d) => !DEFAULT_BADGE_DEFINITIONS.some((b) => b.id === d.id))]);
        setCustomBadgesByUserId(sanitize(parsed.assignments));
      } else {
        setBadgeDefinitions(DEFAULT_BADGE_DEFINITIONS);
        setCustomBadgesByUserId(sanitize(parsed));
      }
    } catch { setBadgeDefinitions(DEFAULT_BADGE_DEFINITIONS); setCustomBadgesByUserId({}); }
  }, [auth, currentUserIsPlatformOwner]);

  useEffect(() => {
    if (!auth || !currentUserIsPlatformOwner) return;
    window.localStorage.setItem(`${BADGE_STORAGE_PREFIX}:${auth.user.id}`, JSON.stringify({ assignments: customBadgesByUserId, definitions: badgeDefinitions }));
  }, [auth, customBadgesByUserId, currentUserIsPlatformOwner, badgeDefinitions]);

  useEffect(() => {
    if (!knownUsers.length) { setBadgeTargetUserId(""); return; }
    setBadgeTargetUserId((c) => (c && knownUsers.some((u) => u.id === c)) ? c : (knownUsers[0]?.id ?? ""));
  }, [knownUsers]);

  const toggleBadgeForUser = (userId: string, badge: BadgeId) => {
    setCustomBadgesByUserId((prev) => {
      const cur = prev[userId] ?? [];
      const next = cur.includes(badge) ? cur.filter((b) => b !== badge) : [...cur, badge];
      if (!next.length) { const { [userId]: _, ...rest } = prev; return rest; }
      return { ...prev, [userId]: next };
    });
  };

  const createCustomBadge = () => {
    const label = newBadgeLabel.trim();
    const shortLabel = newBadgeShortLabel.trim().toUpperCase();
    if (!label || !shortLabel || shortLabel.length > 10) { setMessage("Badge braucht Namen und ein kurzes Label (max. 10 Zeichen)."); return; }
    const id = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`;
    if (!id || badgeDefinitions.some((b) => b.id === id)) { setMessage("Badge existiert bereits."); return; }
    setBadgeDefinitions((prev) => [...prev, { id, label, shortLabel }]);
    if (auth?.user.id) { toggleBadgeForUser(auth.user.id, id); setBadgeTargetUserId(auth.user.id); }
    setNewBadgeLabel(""); setNewBadgeShortLabel("");
    setMessage("Neues Badge erstellt.");
  };

  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, activeChannelId]);

  const { submit } = useAuthFlow({
    auth, theme, mode, email, password, displayName, token, resetTokenFromLink,
    showAuthPage, googleRenderAttempt, googleButtonRef,
    setAuth, setLoading, setMessage, setMode, setToken, setPassword,
    setResetTokenFromLink, setShowAuthPage, setGoogleReady, setGoogleLoadError
  });

  const {
    onToggleGlobalUploads, onCreateChannel, onCreateChannelFromModal,
    onSendMessage, onSearch, onBlockSender, onEditMessage, onSaveEdit,
    onDeleteMessage, onUploadSelected, onStartDirectByUsername,
    onAddMemberByUsername, onToggleMemberRole, onRemoveMember,
    onTransferOwnership, onLeaveGroup, onDeleteGroup, onSaveProfile
  } = useChatActions({
    auth, activeChannelId, activeChannel, ownMembershipRole,
    canModerateMembers, canManageRoles, canManagePlatformSettings,
    openChannel, setMessage, setChannels, setMessages,
    setEditingMessageId, setEditingContent, setComposerText,
    setReplyingToMessageId, setSearchResults, setDirectUsername,
    setDirectModalOpen, setAddMemberUsername, setAddMemberModalOpen,
    setChannelMembers, setActiveChannelId, setNewChannelName,
    setCreateChannelModalOpen, setSettingsOpen, setUploadsEnabledForAll,
    setPlatformToggleLoading, setAuth,
    searchQuery, composerText, replyingToMessageId, editingContent,
    newChannelName, directUsername, addMemberUsername,
    profileNickname, profileUsername, uploadsEnabledForAll
  });

  useEffect(() => {
    const load = async () => {
      if (!auth || !activeChannelId) { setPolls([]); return; }
      try { setPolls(await listPolls(auth.tokens.accessToken, activeChannelId)); }
      catch { setPolls([]); }
    };
    void load();
  }, [auth, activeChannelId]);

  const updateMentionState = (value: string, caret: number) => {
    const m = value.slice(0, caret).match(/(?:^|\s)@([a-z0-9_]*)$/iu);
    if (!m) { setMentionQuery(null); setMentionIndex(0); return; }
    setMentionQuery((m[1] ?? "").toLowerCase()); setMentionIndex(0);
  };

  const insertMention = (username: string) => {
    const ta = composerRef.current;
    if (!ta) return;
    const caret = ta.selectionStart ?? composerText.length;
    const before = composerText.slice(0, caret).replace(/(?:^|\s)@([a-z0-9_]*)$/iu, (full) => `${full.startsWith(" ") ? " " : ""}@${username} `);
    const next = `${before}${composerText.slice(caret)}`;
    setComposerText(next); setMentionQuery(null);
    window.requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(before.length, before.length); });
  };

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMentionCandidates.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((c) => (c + 1) % filteredMentionCandidates.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((c) => (c - 1 + filteredMentionCandidates.length) % filteredMentionCandidates.length); return; }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); insertMention(filteredMentionCandidates[mentionIndex]?.username ?? filteredMentionCandidates[0].username); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void onSendMessage(); }
  };

  const onComposerChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setComposerText(next);
    updateMentionState(next, e.target.selectionStart ?? next.length);
    if (auth && activeChannelId && next.trim() && socketRef.current)
      socketRef.current.emit(REALTIME_EVENTS.TYPING, { roomId: activeChannelId, userId: auth.user.id });
  };

  const stopVoiceStream = () => {
    const s = voiceStreamRef.current;
    if (!s) return;
    s.getTracks().forEach((t) => t.stop());
    voiceStreamRef.current = null;
  };

  const onStartVoiceNote = async () => {
    if (!auth || !activeChannelId || voiceNoteState !== "idle") return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMessage("Sprachnachrichten werden von diesem Browser nicht unterst\u00fctzt."); return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      voiceStreamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported(m));
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      voiceChunksRef.current = [];
      recorder.ondataavailable = (ev) => { if (ev.data.size > 0) voiceChunksRef.current.push(ev.data); };
      recorder.onstop = async () => {
        if (!auth || !activeChannelId) { stopVoiceStream(); setVoiceNoteState("idle"); return; }
        setVoiceNoteState("uploading");
        try {
          const mimeType = recorder.mimeType || mime || "audio/webm";
          const ext = mimeType.includes("ogg") ? "ogg" : mimeType.includes("mp4") ? "m4a" : "webm";
          const file = new File([new Blob(voiceChunksRef.current, { type: mimeType })], `voice-${Date.now()}.${ext}`, { type: mimeType });
          const uploaded = await uploadFile(auth.tokens.accessToken, file);
          await sendMessage(auth.tokens.accessToken, activeChannelId, `[voice] ${uploaded.url}`);
          setMessage("Sprachnachricht gesendet.");
        } catch (err) {
          setMessage(err instanceof Error ? err.message : "Sprachnachricht fehlgeschlagen");
        } finally { voiceChunksRef.current = []; stopVoiceStream(); voiceRecorderRef.current = null; setVoiceNoteState("idle"); }
      };
      recorder.start(); voiceRecorderRef.current = recorder; setVoiceNoteState("recording"); setMessage("Aufnahme l\u00e4uft \u2026");
    } catch (err) { stopVoiceStream(); setVoiceNoteState("idle"); setMessage(err instanceof Error ? err.message : "Mikrofon konnte nicht gestartet werden"); }
  };

  const onStopVoiceNote = () => {
    const r = voiceRecorderRef.current;
    if (!r || voiceNoteState !== "recording") return;
    r.stop(); setMessage("Verarbeite Sprachnachricht \u2026");
  };

  const onSummarizeChannel = async () => {
    if (!auth || !activeChannelId || summaryLoading) return;
    setSummaryLoading(true); setMessage("Erstelle Zusammenfassung \u2026");
    try {
      const r = await summarizeChannel(auth.tokens.accessToken, activeChannelId, { days: 7, limit: 150 });
      setMessage(`Zusammenfassung (${r.source === "ai" ? "AI" : "Fallback"}, ${r.messageCount} Nachrichten):\n${r.summary}`);
    } catch (err) { setMessage(err instanceof Error ? err.message : "Zusammenfassung fehlgeschlagen"); }
    finally { setSummaryLoading(false); }
  };

  const onReplyToMessage = (id: string) => { setReplyingToMessageId(id); composerRef.current?.focus(); };
  const onCancelReply = () => setReplyingToMessageId(null);

  const onCreatePoll = async () => {
    if (!auth || !activeChannelId || pollLoading) return;
    const question = window.prompt("Frage:", "");
    if (!question?.trim()) return;
    const raw = window.prompt("Optionen (Komma getrennt):", "Ja,Nein");
    if (!raw?.trim()) return;
    const options = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (options.length < 2) { setMessage("Mindestens 2 Optionen erforderlich."); return; }
    setPollLoading(true);
    try {
      const created = await createPoll(auth.tokens.accessToken, activeChannelId, { question: question.trim(), options });
      setPolls((prev) => [created, ...prev]); setMessage("Umfrage erstellt.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Umfrage fehlgeschlagen"); }
    finally { setPollLoading(false); }
  };

  const onVotePoll = async (pollId: string, optionId: string) => {
    if (!auth || !activeChannelId) return;
    try {
      const updated = await votePoll(auth.tokens.accessToken, activeChannelId, pollId, optionId);
      setPolls((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch (err) { setMessage(err instanceof Error ? err.message : "Abstimmung fehlgeschlagen"); }
  };

  useEffect(() => () => {
    if (voiceRecorderRef.current?.state !== "inactive") voiceRecorderRef.current?.stop();
    stopVoiceStream();
  }, []);

  const renderContentWithMentions = (content: string) => {
    const own = auth?.user.username?.toLowerCase();
    return content.split(/(@[a-z0-9_]{3,24})/gi).map((part, i) => {
      if (!part.startsWith("@")) return <span key={`t-${i}`}>{part}</span>;
      const cls = own && part.slice(1).toLowerCase() === own ? "mention-hit" : "mention";
      return <span key={`m-${i}`} className={cls}>{part}</span>;
    });
  };

  const logout = () => {
    setAuth(null); setMessages([]); setPolls([]); setChannels([]);
    setActiveChannelId(null); setReplyingToMessageId(null);
    setSearchResults([]); setSearchQuery(""); setComposerText("");
    setMessage(""); setMentionNotice("");
  };

  if (auth) {
    return (
      <ChatLayout
        auth={auth} theme={theme}
        onToggleTheme={() => setTheme((c) => c === "dark" ? "light" : "dark")}
        onLogout={logout} realtimeState={realtimeState}
        currentUserIsPlatformOwner={currentUserIsPlatformOwner}
        renderPlatformOwnerBadge={renderPlatformOwnerBadge}
        renderCustomBadges={renderCustomBadges}
        isMobileLayout={isMobileLayout} mobilePane={mobilePane} setMobilePane={setMobilePane}
        channels={channels} sortedChannels={sortedChannels}
        activeChannel={activeChannel} activeChannelId={activeChannelId}
        ownMembershipRole={ownMembershipRole} channelMembers={channelMembers}
        canManageRoles={canManageRoles} canModerateMembers={canModerateMembers}
        onOpenCreateChannelModal={() => setCreateChannelModalOpen(true)}
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
        onLeaveGroup={onLeaveGroup} onDeleteGroup={onDeleteGroup}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        onSearch={onSearch} onSummarizeChannel={onSummarizeChannel}
        summaryLoading={summaryLoading}
        polls={polls} pollLoading={pollLoading}
        onCreatePoll={onCreatePoll} onVotePoll={onVotePoll}
        searchResults={searchResults}
        activeConversationStatus={activeConversationStatus}
        voiceSupported={voiceSupported} voiceCallState={voiceCallState}
        voiceParticipants={voiceParticipants} isVoiceMuted={isVoiceMuted}
        onStartVoiceCall={onStartVoiceCall} onLeaveVoiceCall={onLeaveVoiceCall}
        onToggleVoiceMute={onToggleVoiceMute}
        messages={messages} replyingToMessageId={replyingToMessageId}
        onReplyToMessage={onReplyToMessage} onCancelReply={onCancelReply}
        messageListRef={messageListRef}
        activeMessageId={activeMessageId} setActiveMessageId={setActiveMessageId}
        presenceMap={presenceMap} memberRoleByUserId={memberRoleByUserId}
        editingMessageId={editingMessageId} editingContent={editingContent}
        setEditingContent={setEditingContent}
        onSaveEdit={onSaveEdit} onEditMessage={onEditMessage}
        onDeleteMessage={onDeleteMessage} onBlockSender={onBlockSender}
        renderContentWithMentions={renderContentWithMentions}
        composerText={composerText} composerRef={composerRef}
        onComposerChange={onComposerChange} onComposerKeyDown={onComposerKeyDown}
        mentionQuery={mentionQuery}
        filteredMentionCandidates={filteredMentionCandidates}
        mentionIndex={mentionIndex} insertMention={insertMention}
        onSendMessage={onSendMessage}
        uploadsEnabledForAll={uploadsEnabledForAll}
        onUploadSelected={onUploadSelected}
        voiceNoteSupported={typeof window !== "undefined" && typeof MediaRecorder !== "undefined"}
        voiceNoteState={voiceNoteState}
        onStartVoiceNote={onStartVoiceNote} onStopVoiceNote={onStopVoiceNote}
        message={message} mentionNotice={mentionNotice}
        settingsOpen={settingsOpen} setSettingsOpen={setSettingsOpen}
        settingsTab={settingsTab} setSettingsTab={setSettingsTab}
        profileNickname={profileNickname} setProfileNickname={setProfileNickname}
        profileUsername={profileUsername} setProfileUsername={setProfileUsername}
        onSaveProfile={onSaveProfile}
        knownUsers={knownUsers}
        badgeTargetUserId={badgeTargetUserId} setBadgeTargetUserId={setBadgeTargetUserId}
        badgeTargetUser={badgeTargetUser} badgeDefinitions={badgeDefinitions}
        customBadgesByUserId={customBadgesByUserId}
        toggleBadgeForUser={toggleBadgeForUser}
        newBadgeLabel={newBadgeLabel} setNewBadgeLabel={setNewBadgeLabel}
        newBadgeShortLabel={newBadgeShortLabel} setNewBadgeShortLabel={setNewBadgeShortLabel}
        createCustomBadge={createCustomBadge}
        canManagePlatformSettings={canManagePlatformSettings}
        uploadsEnabled={uploadsEnabledForAll}
        platformToggleLoading={platformToggleLoading}
        onToggleGlobalUploads={onToggleGlobalUploads}
        createChannelModalOpen={createChannelModalOpen}
        setCreateChannelModalOpen={setCreateChannelModalOpen}
        newChannelName={newChannelName} setNewChannelName={setNewChannelName}
        onCreateChannelFromModal={onCreateChannelFromModal}
        directModalOpen={directModalOpen} setDirectModalOpen={setDirectModalOpen}
        directUsername={directUsername} setDirectUsername={setDirectUsername}
        onStartDirectByUsername={onStartDirectByUsername}
        addMemberModalOpen={addMemberModalOpen} setAddMemberModalOpen={setAddMemberModalOpen}
        addMemberUsername={addMemberUsername} setAddMemberUsername={setAddMemberUsername}
        onAddMemberByUsername={onAddMemberByUsername}
      />
    );
  }

  if (!resetTokenFromLink && !showAuthPage) {
    return (
      <LandingPage
        onOpenLogin={() => { setMode("login"); setShowAuthPage(true); }}
        onOpenRegister={() => { setMode("register"); setShowAuthPage(true); }}
      />
    );
  }

  return (
    <AuthCard
      resetTokenFromLink={resetTokenFromLink} mode={mode} setMode={setMode}
      email={email} setEmail={setEmail} password={password} setPassword={setPassword}
      displayName={displayName} setDisplayName={setDisplayName}
      token={token} setToken={setToken} submit={submit} loading={loading} message={message}
      googleClientId={googleClientId} googleButtonRef={googleButtonRef}
      googleReady={googleReady} googleLoadError={googleLoadError}
      onRetryGoogleRender={() => setGoogleRenderAttempt((c) => c + 1)}
      onBackToLoginFromReset={() => { setResetTokenFromLink(null); window.history.replaceState({}, "", "/"); setMode("login"); setToken(""); }}
      onBackToLanding={() => { setShowAuthPage(false); setMessage(""); }}
    />
  );
}
