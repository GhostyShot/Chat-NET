import { useEffect } from "react";
import {
  getPlatformSettings, getPresence, getProfile,
  listChannelMembers, listChannels, listMessages, markRead,
} from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

export function useChatDataSync() {
  const auth = useAuthStore((s) => s.auth);
  const setAuth = useAuthStore((s) => s.setAuth);
  const {
    activeChannelId, messages,
    setMessage, setChannels, setMessages, setChannelMembers,
    setPresenceMap, setUnreadByChannelId, setUploadsEnabledForAll,
    setCanManagePlatformSettings, setRealtimeState,
  } = useChatStore();
  const channels = useChatStore((s) => s.channels);
  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null;

  // Platform settings
  useEffect(() => {
    const load = async () => {
      if (!auth) { setUploadsEnabledForAll(true); setCanManagePlatformSettings(false); return; }
      try {
        const s = await getPlatformSettings(auth.tokens.accessToken);
        setUploadsEnabledForAll(s.uploadsEnabled);
        setCanManagePlatformSettings(s.canManage);
      } catch { setUploadsEnabledForAll(true); setCanManagePlatformSettings(false); }
    };
    void load();
  // accessToken is a stable string dep — avoids re-firing on object identity changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.tokens.accessToken]);

  // Channels
  useEffect(() => {
    const load = async () => {
      if (!auth) {
        setChannels([]); setMessages([]); setChannelMembers([]);
        setPresenceMap({}); setUnreadByChannelId({}); setRealtimeState("offline"); return;
      }
      try { setChannels(await listChannels(auth.tokens.accessToken)); }
      catch (e) { setMessage(e instanceof Error ? e.message : "Channels konnten nicht geladen werden"); }
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.tokens.accessToken]);

  // Profile
  useEffect(() => {
    const load = async () => {
      if (!auth) return;
      try {
        const profile = await getProfile(auth.tokens.accessToken);
        setAuth({ ...auth, user: { ...auth.user, ...profile, avatarUrl: profile.avatarUrl ?? undefined } });
      } catch { /* keep */ }
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.tokens.accessToken]);

  // Messages
  useEffect(() => {
    const load = async () => {
      if (!auth || !activeChannelId) { setMessages([]); return; }
      try {
        const r = await listMessages(auth.tokens.accessToken, activeChannelId);
        setMessages(r.items.slice().reverse());
      } catch (e) { setMessage(e instanceof Error ? e.message : "Nachrichten konnten nicht geladen werden"); }
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.tokens.accessToken, activeChannelId]);

  // Clear unread
  useEffect(() => {
    if (!activeChannelId) return;
    setUnreadByChannelId((prev) => {
      if (!prev[activeChannelId]) return prev;
      const { [activeChannelId]: _, ...rest } = prev; return rest;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId]);

  // Channel members
  useEffect(() => {
    const load = async () => {
      if (!auth || !activeChannelId || activeChannel?.type !== "GROUP") { setChannelMembers([]); return; }
      try { setChannelMembers(await listChannelMembers(auth.tokens.accessToken, activeChannelId)); }
      catch { setChannelMembers([]); }
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.tokens.accessToken, activeChannelId, activeChannel?.type]);

  // Presence
  useEffect(() => {
    const load = async () => {
      if (!auth || !messages.length) return;
      const ids = [...new Set(messages.map((m) => m.sender.id))];
      try {
        const p = await getPresence(auth.tokens.accessToken, ids);
        setPresenceMap(Object.fromEntries(p.map((x) => [x.userId, x.online])));
      } catch { /* ignore */ }
    };
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.tokens.accessToken, messages.length]);

  // Mark read
  useEffect(() => {
    const mark = async () => {
      if (!auth || !activeChannelId || !messages.length) return;
      try { await markRead(auth.tokens.accessToken, activeChannelId, messages[messages.length - 1].id); }
      catch { /* ignore */ }
    };
    void mark();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.tokens.accessToken, activeChannelId, messages.length]);
}
