import { useEffect } from "react";
import {
  getPlatformSettings,
  getPresence,
  getProfile,
  listChannelMembers,
  listChannels,
  listMessages,
  markRead,
} from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

export function useChatDataSync() {
  const auth = useAuthStore((s) => s.auth);
  const setAuth = useAuthStore((s) => s.setAuth);

  const {
    activeChannelId,
    messages,
    setMessage,
    setChannels,
    setMessages,
    setChannelMembers,
    setPresenceMap,
    setUnreadByChannelId,
    setUploadsEnabledForAll,
    setCanManagePlatformSettings,
    setRealtimeState,
  } = useChatStore();

  const channels = useChatStore((s) => s.channels);
  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null;

  useEffect(() => {
    const load = async () => {
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
    void load();
  }, [auth, setCanManagePlatformSettings, setUploadsEnabledForAll]);

  useEffect(() => {
    const load = async () => {
      if (!auth) {
        setChannels([]);
        setMessages([]);
        setChannelMembers([]);
        setPresenceMap({});
        setUnreadByChannelId({});
        setRealtimeState("offline");
        return;
      }
      try {
        const list = await listChannels(auth.tokens.accessToken);
        setChannels(list);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Channels konnten nicht geladen werden");
      }
    };
    void load();
  }, [auth, setChannelMembers, setChannels, setMessage, setMessages, setPresenceMap, setRealtimeState, setUnreadByChannelId]);

  useEffect(() => {
    const load = async () => {
      if (!auth) return;
      try {
        const profile = await getProfile(auth.tokens.accessToken);
        setAuth({
          ...auth,
          user: { ...auth.user, ...profile, avatarUrl: profile.avatarUrl ?? undefined },
        });
      } catch { /* keep existing */ }
    };
    void load();
  }, [auth?.tokens.accessToken]);

  useEffect(() => {
    const load = async () => {
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
    void load();
  }, [auth, activeChannelId]);

  useEffect(() => {
    if (!activeChannelId) return;
    setUnreadByChannelId((prev) => {
      if (!prev[activeChannelId]) return prev;
      const { [activeChannelId]: _removed, ...rest } = prev;
      return rest;
    });
  }, [activeChannelId]);

  useEffect(() => {
    const load = async () => {
      if (!auth || !activeChannelId || activeChannel?.type !== "GROUP") {
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
    void load();
  }, [auth, activeChannelId, activeChannel?.type]);

  useEffect(() => {
    const load = async () => {
      if (!auth || messages.length === 0) return;
      const ids = Array.from(new Set(messages.map((m) => m.sender.id)));
      const presence = await getPresence(auth.tokens.accessToken, ids);
      const next = Object.fromEntries(presence.map((p) => [p.userId, p.online]));
      setPresenceMap(next);
    };
    void load();
  }, [auth, messages]);

  useEffect(() => {
    const mark = async () => {
      if (!auth || !activeChannelId || messages.length === 0) return;
      const latest = messages[messages.length - 1];
      await markRead(auth.tokens.accessToken, activeChannelId, latest.id);
    };
    void mark();
  }, [auth, activeChannelId, messages]);
}
