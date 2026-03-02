import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { AuthResponse } from "@chatnet/shared";
import {
  getPlatformSettings,
  getPresence,
  getProfile,
  listChannelMembers,
  listChannels,
  listMessages,
  markRead,
  type ChannelItem,
  type ChannelMemberItem,
  type MessageItem
} from "../lib/api";

type UseChatDataSyncParams = {
  auth: AuthResponse | null;
  activeChannelId: string | null;
  activeChannelType?: ChannelItem["type"];
  messages: MessageItem[];
  setAuth: Dispatch<SetStateAction<AuthResponse | null>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setChannels: Dispatch<SetStateAction<ChannelItem[]>>;
  setMessages: Dispatch<SetStateAction<MessageItem[]>>;
  setChannelMembers: Dispatch<SetStateAction<ChannelMemberItem[]>>;
  setPresenceMap: Dispatch<SetStateAction<Record<string, boolean>>>;
  setUnreadByChannelId: Dispatch<SetStateAction<Record<string, number>>>;
  setUploadsEnabledForAll: Dispatch<SetStateAction<boolean>>;
  setCanManagePlatformSettings: Dispatch<SetStateAction<boolean>>;
  setRealtimeState: Dispatch<SetStateAction<"connecting" | "online" | "offline">>;
};

export function useChatDataSync({
  auth,
  activeChannelId,
  activeChannelType,
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
}: UseChatDataSyncParams) {
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
  }, [auth, setCanManagePlatformSettings, setUploadsEnabledForAll]);

  useEffect(() => {
    const loadChannels = async () => {
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

    void loadChannels();
  }, [
    auth,
    setChannelMembers,
    setChannels,
    setMessage,
    setMessages,
    setPresenceMap,
    setRealtimeState,
    setUnreadByChannelId
  ]);

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
  }, [auth?.tokens.accessToken, setAuth]);

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
  }, [auth, activeChannelId, setMessage, setMessages]);

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
  }, [activeChannelId, setUnreadByChannelId]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!auth || !activeChannelId || activeChannelType !== "GROUP") {
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
  }, [auth, activeChannelId, activeChannelType, setChannelMembers]);

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
  }, [auth, messages, setPresenceMap]);

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
}
