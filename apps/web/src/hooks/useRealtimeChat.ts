import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { AuthResponse } from "@chatnet/shared";
import { io, type Socket } from "socket.io-client";
import { API_URL, type ChannelItem, type MessageItem } from "../lib/api";

type UseRealtimeChatParams = {
  auth: AuthResponse | null;
  activeChannelId: string | null;
  setChannels: Dispatch<SetStateAction<ChannelItem[]>>;
  setMessages: Dispatch<SetStateAction<MessageItem[]>>;
  setUnreadByChannelId: Dispatch<SetStateAction<Record<string, number>>>;
  setMentionNotice: Dispatch<SetStateAction<string>>;
  setPresenceMap: Dispatch<SetStateAction<Record<string, boolean>>>;
  setTypingHint: Dispatch<SetStateAction<string>>;
  setRealtimeState: Dispatch<SetStateAction<"connecting" | "online" | "offline">>;
};

export function useRealtimeChat({
  auth,
  activeChannelId,
  setChannels,
  setMessages,
  setUnreadByChannelId,
  setMentionNotice,
  setPresenceMap,
  setTypingHint,
  setRealtimeState
}: UseRealtimeChatParams): MutableRefObject<Socket | null> {
  const socketRef = useRef<Socket | null>(null);

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
    setRealtimeState("connecting");

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
      if (ownUsername && !isOwnMessage && incoming.content.toLowerCase().includes(`@${ownUsername}`)) {
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

    const onConnect = () => {
      setRealtimeState("online");
    };

    const onDisconnect = () => {
      setRealtimeState("offline");
    };

    const onConnectError = () => {
      setRealtimeState("offline");
    };

    socket.on("new_message", onNewMessage);
    socket.on("typing", onTyping);
    socket.on("presence_update", onPresenceUpdate);
    socket.on("message_updated", onMessageUpdated);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    if (activeChannelId) {
      socket.emit("join_room", activeChannelId);
    }

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("typing", onTyping);
      socket.off("presence_update", onPresenceUpdate);
      socket.off("message_updated", onMessageUpdated);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
      socketRef.current = null;
      setRealtimeState("offline");
    };
  }, [
    auth,
    activeChannelId,
    setChannels,
    setMentionNotice,
    setMessages,
    setPresenceMap,
    setRealtimeState,
    setTypingHint,
    setUnreadByChannelId
  ]);

  return socketRef;
}
