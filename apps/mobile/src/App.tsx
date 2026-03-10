import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import type {
  AuthResponse,
  DeletedMessageResponse,
  PresenceItem,
  RealtimeClientToServerEvents,
  RealtimeServerToClientEvents,
  RealtimeTypingPayload
} from "@chatnet/shared";
import { REALTIME_EVENTS } from "@chatnet/shared";
import { io, type Socket } from "socket.io-client";
import { API_URL, api, type ChannelItem, type ChannelMemberItem, type MessageItem } from "./api";

type Mode = "login" | "register" | "forgot" | "reset";
type Panel = "channels" | "chat" | "members" | "search";
const chatNetLogo = require("../assets/chat-net-logo.png");

export default function App() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [composerText, setComposerText] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [typingHint, setTypingHint] = useState("");
  const socketRef = useRef<Socket<RealtimeServerToClientEvents, RealtimeClientToServerEvents> | null>(null);
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageItem[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [channelMembers, setChannelMembers] = useState<ChannelMemberItem[]>([]);
  const [panel, setPanel] = useState<Panel>("channels");
  const flatListRef = useRef<FlatList<MessageItem>>(null);

  const activeChannel = channels.find((channel) => channel.id === activeChannelId) ?? null;
  const ownRole = activeChannel?.memberships?.find((membership) => membership.user.id === auth?.user.id)?.role ?? null;
  const canModerateMembers = ownRole === "OWNER" || ownRole === "ADMIN";
  const canManageRoles = ownRole === "OWNER";
  const memberRoleByUserId = new Map<string, "OWNER" | "ADMIN" | "MEMBER">(
    (activeChannel?.memberships ?? []).map((membership) => [membership.user.id, membership.role])
  );

  useEffect(() => {
    const loadChannels = async () => {
      if (!auth) {
        setChannels([]);
        setActiveChannelId(null);
        return;
      }

      try {
        const list = await api.listChannels(auth.tokens.accessToken);
        setChannels(list);
        setActiveChannelId((current) => current ?? list[0]?.id ?? null);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Channels konnten nicht geladen werden");
      }
    };

    void loadChannels();
  }, [auth]);

  useEffect(() => {
    const loadMessages = async () => {
      if (!auth || !activeChannelId) {
        setMessages([]);
        return;
      }

      try {
        const payload = await api.listMessages(auth.tokens.accessToken, activeChannelId);
        setMessages(payload.items.slice().reverse());
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Nachrichten konnten nicht geladen werden");
      }
    };

    void loadMessages();
  }, [auth, activeChannelId]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!auth || !activeChannelId || !activeChannel || activeChannel.type !== "GROUP") {
        setChannelMembers([]);
        return;
      }

      try {
        const members = await api.listChannelMembers(auth.tokens.accessToken, activeChannelId);
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

    const socket: Socket<RealtimeServerToClientEvents, RealtimeClientToServerEvents> = io(API_URL, {
      auth: { token: auth.tokens.accessToken }
    });
    socketRef.current = socket;

    const onNewMessage = (incoming: MessageItem) => {
      if (activeChannelId && incoming.channelId && incoming.channelId !== activeChannelId) {
        return;
      }
      setMessages((previous) => {
        if (previous.some((entry) => entry.id === incoming.id)) {
          return previous;
        }
        return [...previous, incoming];
      });
    };

    const onTyping = (payload: RealtimeTypingPayload) => {
      if (!activeChannelId || payload.roomId !== activeChannelId || payload.userId === auth.user.id) {
        return;
      }
      setTypingHint("Jemand schreibt gerade...");
      setTimeout(() => setTypingHint(""), 1200);
    };

    const onPresenceUpdate = (payload: PresenceItem) => {
      setPresenceMap((previous) => ({ ...previous, [payload.userId]: payload.online }));
    };

    const onMessageUpdated = (updated: MessageItem) => {
      setMessages((previous) => previous.map((entry) => (entry.id === updated.id ? updated : entry)));
    };

    const onMessageDeleted = (payload: DeletedMessageResponse) => {
      if (!payload.deleted) {
        return;
      }
      setMessages((previous) => previous.filter((entry) => entry.id !== payload.id));
    };

    socket.on(REALTIME_EVENTS.NEW_MESSAGE, onNewMessage);
    socket.on(REALTIME_EVENTS.TYPING, onTyping);
    socket.on(REALTIME_EVENTS.PRESENCE_UPDATE, onPresenceUpdate);
    socket.on(REALTIME_EVENTS.MESSAGE_UPDATED, onMessageUpdated);
    socket.on(REALTIME_EVENTS.MESSAGE_DELETED, onMessageDeleted);

    if (activeChannelId) {
      socket.emit(REALTIME_EVENTS.JOIN_ROOM, activeChannelId);
    }

    return () => {
      socket.off(REALTIME_EVENTS.NEW_MESSAGE, onNewMessage);
      socket.off(REALTIME_EVENTS.TYPING, onTyping);
      socket.off(REALTIME_EVENTS.PRESENCE_UPDATE, onPresenceUpdate);
      socket.off(REALTIME_EVENTS.MESSAGE_UPDATED, onMessageUpdated);
      socket.off(REALTIME_EVENTS.MESSAGE_DELETED, onMessageDeleted);
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
      const data = await api.getPresence(auth.tokens.accessToken, ids);
      setPresenceMap(Object.fromEntries(data.map((item) => [item.userId, item.online])));
    };
    void loadPresence();
  }, [auth, messages]);

  useEffect(() => {
    const markLatestAsRead = async () => {
      if (!auth || !activeChannelId || messages.length === 0) {
        return;
      }
      const latest = messages[messages.length - 1];
      await api.markRead(auth.tokens.accessToken, activeChannelId, latest.id);
    };
    void markLatestAsRead();
  }, [auth, activeChannelId, messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && panel === "chat") {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages, panel]);

  const submit = async () => {
    try {
      if (mode === "login") {
        const auth = await api.login(email, password);
        setAuth(auth);
        setMessage(`Willkommen ${auth.user.displayName}`);
      }
      if (mode === "register") {
        const auth = await api.register(email, password, displayName);
        setAuth(auth);
        setMessage(`Account erstellt für ${auth.user.displayName}`);
      }
      if (mode === "forgot") {
        await api.forgot(email);
        setMessage("Wenn ein Konto existiert, wurde eine E-Mail mit Reset-Link verschickt.");
      }
      if (mode === "reset") {
        await api.reset(token, password);
        setMessage("Passwort aktualisiert.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unbekannter Fehler");
    }
  };

  const google = async () => {
    try {
      const auth = await api.google("dev_mobile_google_user");
      setAuth(auth);
      setMessage(`Google Login: ${auth.user.displayName}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google Login Fehler");
    }
  };

  const onCreateChannel = async () => {
    if (!auth || !newChannelName.trim()) {
      return;
    }

    try {
      const channel = await api.createGroupChannel(auth.tokens.accessToken, newChannelName.trim());
      setChannels((previous) => [channel, ...previous]);
      setActiveChannelId(channel.id);
      setNewChannelName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Channel konnte nicht erstellt werden");
    }
  };

  const onStartDirectByUsername = async () => {
    if (!auth || !inviteUsername.trim()) {
      return;
    }

    try {
      const channel = await api.createDirectByUsername(auth.tokens.accessToken, inviteUsername.trim());
      setChannels((previous) => {
        if (previous.some((entry) => entry.id === channel.id)) {
          return previous;
        }
        return [channel, ...previous];
      });
      setActiveChannelId(channel.id);
      setInviteUsername("");
      setMessage("Direktchat erstellt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Direktchat fehlgeschlagen");
    }
  };

  const onAddMemberByUsername = async () => {
    if (!auth || !activeChannelId || !activeChannel || activeChannel.type !== "GROUP" || !inviteUsername.trim()) {
      return;
    }

    try {
      await api.addGroupMemberByUsername(auth.tokens.accessToken, activeChannelId, inviteUsername.trim());
      const members = await api.listChannelMembers(auth.tokens.accessToken, activeChannelId);
      setChannelMembers(members);
      setInviteUsername("");
      setMessage("Mitglied hinzugefügt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Hinzufügen fehlgeschlagen");
    }
  };

  const onToggleMemberRole = async (member: ChannelMemberItem) => {
    if (!auth || !activeChannelId || !canManageRoles) {
      return;
    }

    const role = member.role === "ADMIN" ? "member" : "admin";
    try {
      const updated = await api.updateChannelMemberRole(auth.tokens.accessToken, activeChannelId, member.userId, role);
      setChannelMembers((previous) =>
        previous.map((entry) => (entry.userId === member.userId ? { ...entry, role: updated.role } : entry))
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rolle konnte nicht geändert werden");
    }
  };

  const onRemoveMember = async (member: ChannelMemberItem) => {
    if (!auth || !activeChannelId || !canModerateMembers) {
      return;
    }

    try {
      await api.removeChannelMember(auth.tokens.accessToken, activeChannelId, member.userId);
      setChannelMembers((previous) => previous.filter((entry) => entry.userId !== member.userId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mitglied konnte nicht entfernt werden");
    }
  };

  const onTransferOwnership = async (member: ChannelMemberItem) => {
    if (!auth || !activeChannelId || !canManageRoles) {
      return;
    }

    try {
      await api.transferChannelOwnership(auth.tokens.accessToken, activeChannelId, member.userId);
      const [members, list] = await Promise.all([
        api.listChannelMembers(auth.tokens.accessToken, activeChannelId),
        api.listChannels(auth.tokens.accessToken)
      ]);
      setChannelMembers(members);
      setChannels(list);
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
      await api.leaveChannel(auth.tokens.accessToken, activeChannelId);
      const list = await api.listChannels(auth.tokens.accessToken);
      setChannels(list);
      setActiveChannelId((current) => {
        if (current && list.some((entry) => entry.id === current)) {
          return current;
        }
        return list[0]?.id ?? null;
      });
      setChannelMembers([]);
      setMessage("Du hast die Gruppe verlassen.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gruppe konnte nicht verlassen werden");
    }
  };

  const onDeleteGroup = async () => {
    if (!auth || !activeChannelId || !activeChannel || activeChannel.type !== "GROUP" || ownRole !== "OWNER") {
      return;
    }

    Alert.alert("Gruppe löschen", `Willst du \"${activeChannel.name ?? "Unbenannt"}\" wirklich löschen?`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await api.deleteGroupChannel(auth.tokens.accessToken, activeChannelId);
              const list = await api.listChannels(auth.tokens.accessToken);
              setChannels(list);
              setActiveChannelId((current) => {
                if (current && list.some((entry) => entry.id === current)) {
                  return current;
                }
                return list[0]?.id ?? null;
              });
              setChannelMembers([]);
              setMessage("Gruppe wurde gelöscht.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Gruppe konnte nicht gelöscht werden");
            }
          })();
        }
      }
    ]);
  };

  const onSend = async () => {
    if (!auth || !activeChannelId || !composerText.trim()) {
      return;
    }

    try {
      await api.sendMessage(auth.tokens.accessToken, activeChannelId, composerText.trim());
      setComposerText("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nachricht konnte nicht gesendet werden");
    }
  };

  const onSaveEdit = async (messageId: string) => {
    if (!auth || !activeChannelId || !editingContent.trim()) {
      return;
    }
    try {
      await api.updateMessage(auth.tokens.accessToken, activeChannelId, messageId, editingContent.trim());
      setEditingMessageId(null);
      setEditingContent("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bearbeiten fehlgeschlagen");
    }
  };

  const onDelete = async (messageId: string) => {
    if (!auth || !activeChannelId) {
      return;
    }
    try {
      await api.deleteMessage(auth.tokens.accessToken, activeChannelId, messageId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Löschen fehlgeschlagen");
    }
  };

  const onAttachUrl = () => {
    if (!attachmentUrl.trim()) {
      return;
    }
    setComposerText((previous) => `${previous}${previous ? "\n" : ""}${attachmentUrl.trim()}`);
    setAttachmentUrl("");
  };

  const onSearch = async () => {
    if (!auth || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await api.searchMessages(auth.tokens.accessToken, searchQuery.trim(), activeChannelId ?? undefined);
      setSearchResults(results);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Suche fehlgeschlagen");
    }
  };

  const onBlock = async (targetUserId: string) => {
    if (!auth) {
      return;
    }
    try {
      await api.blockUser(auth.tokens.accessToken, targetUserId);
      setMessage("User wurde blockiert.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Blockieren fehlgeschlagen");
    }
  };

  // ─── constants referenced in JSX ────────────────────────────────────────
  const channelDisplayName = activeChannel
    ? activeChannel.type === "DIRECT"
      ? activeChannel.name ?? "Direktnachricht"
      : activeChannel.name ?? "Unbenannt"
    : "Chat-Net";

  if (auth) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />

        {/* ── Header bar ─────────────────────────────────────── */}
        <View style={styles.header}>
          {panel !== "channels" ? (
            <Pressable style={styles.headerBack} onPress={() => setPanel("channels")}>
              <Text style={styles.headerBackText}>‹</Text>
            </Pressable>
          ) : (
            <Image source={chatNetLogo} style={styles.headerLogo} resizeMode="contain" />
          )}
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {panel === "channels"
                ? "Chat-Net"
                : panel === "chat"
                  ? channelDisplayName
                  : panel === "members"
                    ? "Mitglieder"
                    : "Suche"}
            </Text>
            {panel === "channels" && (
              <Text style={styles.headerSub} numberOfLines={1}>
                {auth.user.displayName}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            {panel === "chat" && activeChannel?.type === "GROUP" && (
              <Pressable style={styles.headerBtn} onPress={() => setPanel("members")}>
                <Text style={styles.headerBtnIcon}>👥</Text>
              </Pressable>
            )}
            {panel === "channels" && (
              <Pressable
                style={styles.headerBtn}
                onPress={() => {
                  setAuth(null);
                  setChannels([]);
                  setMessages([]);
                  setActiveChannelId(null);
                  setPanel("channels");
                }}
              >
                <Text style={styles.headerBtnIcon}>⏻</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ── Channels panel ─────────────────────────────────── */}
        {panel === "channels" && (
          <View style={styles.panelContainer}>
            <View style={styles.inputRow}>
              <TextInput
                value={newChannelName}
                onChangeText={setNewChannelName}
                placeholder="Neue Gruppe erstellen…"
                placeholderTextColor={C.muted}
                style={[styles.input, { flex: 1 }]}
                returnKeyType="done"
                onSubmitEditing={onCreateChannel}
              />
              <Pressable style={styles.btnPrimary} onPress={onCreateChannel}>
                <Text style={styles.btnText}>+</Text>
              </Pressable>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                value={inviteUsername}
                onChangeText={(v) => setInviteUsername(v.toLowerCase())}
                placeholder="@username"
                placeholderTextColor={C.muted}
                style={[styles.input, { flex: 1 }]}
                autoCapitalize="none"
                returnKeyType="done"
              />
              <Pressable style={styles.btnSecondary} onPress={onStartDirectByUsername}>
                <Text style={styles.btnText}>DM</Text>
              </Pressable>
              {activeChannel?.type === "GROUP" && (
                <Pressable style={styles.btnSecondary} onPress={onAddMemberByUsername}>
                  <Text style={styles.btnText}>Add</Text>
                </Pressable>
              )}
            </View>

            <FlatList
              data={channels}
              keyExtractor={(item) => item.id}
              style={{ flex: 1 }}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isActive = item.id === activeChannelId;
                return (
                  <Pressable
                    style={[styles.channelItem, isActive && styles.channelItemActive]}
                    onPress={() => {
                      setActiveChannelId(item.id);
                      setPanel("chat");
                    }}
                  >
                    <View style={styles.channelIcon}>
                      <Text style={styles.channelIconText}>
                        {item.type === "DIRECT" ? "💬" : "#"}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.channelName, isActive && styles.channelNameActive]} numberOfLines={1}>
                        {item.name ?? (item.type === "DIRECT" ? "Direktchat" : "Unbenannt")}
                      </Text>
                      <Text style={styles.channelMeta}>
                        {item.type === "DIRECT" ? "Direktnachricht" : "Gruppe"}
                      </Text>
                    </View>
                    {isActive && <View style={styles.channelActiveDot} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>💬</Text>
                  <Text style={styles.emptyTitle}>Noch keine Channels</Text>
                  <Text style={styles.emptyHint}>Erstelle eine Gruppe oder starte einen Direktchat.</Text>
                </View>
              }
            />

            <Pressable style={styles.searchTabBtn} onPress={() => setPanel("search")}>
              <Text style={styles.searchTabText}>🔍  Nachrichten durchsuchen</Text>
            </Pressable>
          </View>
        )}

        {/* ── Chat panel ─────────────────────────────────────── */}
        {panel === "chat" && (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              style={{ flex: 1 }}
              contentContainerStyle={styles.msgListContent}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => {
                const isOwn = item.sender.id === auth.user.id;
                const isEditing = editingMessageId === item.id;
                const senderRole = memberRoleByUserId.get(item.sender.id);
                const isOnline = !!presenceMap[item.sender.id];
                return (
                  <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
                    {!isOwn && (
                      <View style={styles.avatarWrap}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarLetter}>
                            {item.sender.displayName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        {isOnline && <View style={styles.onlineDot} />}
                      </View>
                    )}
                    <View style={[styles.msgContent, isOwn && styles.msgContentOwn]}>
                      {!isOwn && (
                        <Text style={styles.msgSender}>
                          {item.sender.displayName}
                          {senderRole === "OWNER" ? " 👑" : senderRole === "ADMIN" ? " ⭐" : ""}
                        </Text>
                      )}
                      {isEditing ? (
                        <View style={styles.editRow}>
                          <TextInput
                            value={editingContent}
                            onChangeText={setEditingContent}
                            style={[styles.input, { flex: 1, minHeight: 40 }]}
                            placeholderTextColor={C.muted}
                            autoFocus
                            multiline
                          />
                          <Pressable style={styles.btnPrimary} onPress={() => onSaveEdit(item.id)}>
                            <Text style={styles.btnText}>✓</Text>
                          </Pressable>
                          <Pressable style={styles.btnSecondary} onPress={() => { setEditingMessageId(null); setEditingContent(""); }}>
                            <Text style={styles.btnText}>✕</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                          <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{item.content}</Text>
                        </View>
                      )}
                      {!isEditing && (
                        <View style={[styles.msgActions, isOwn && { justifyContent: "flex-end" }]}>
                          {!isOwn && (
                            <Pressable onPress={() => onBlock(item.sender.id)}>
                              <Text style={styles.msgAction}>🚫</Text>
                            </Pressable>
                          )}
                          {isOwn && (
                            <>
                              <Pressable onPress={() => { setEditingMessageId(item.id); setEditingContent(item.content); }}>
                                <Text style={styles.msgAction}>✏️</Text>
                              </Pressable>
                              <Pressable onPress={() => onDelete(item.id)}>
                                <Text style={styles.msgAction}>🗑️</Text>
                              </Pressable>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                    {isOwn && (
                      <View style={styles.avatarWrap}>
                        <View style={[styles.avatar, styles.avatarOwn]}>
                          <Text style={styles.avatarLetter}>
                            {auth.user.displayName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>💬</Text>
                  <Text style={styles.emptyTitle}>Noch keine Nachrichten</Text>
                  <Text style={styles.emptyHint}>Schreib die erste Nachricht!</Text>
                </View>
              }
            />

            {!!typingHint && (
              <View style={styles.typingBar}>
                <Text style={styles.typingText}>{typingHint}</Text>
              </View>
            )}

            {/* Attachment preview strip */}
            {!!attachmentUrl.trim() && (
              <View style={styles.attachBar}>
                <Text style={styles.attachLabel}>📎</Text>
                <Text style={styles.attachUrl} numberOfLines={1}>{attachmentUrl}</Text>
                <Pressable onPress={onAttachUrl} style={styles.attachBtn}>
                  <Text style={styles.btnText}>✓</Text>
                </Pressable>
                <Pressable onPress={() => setAttachmentUrl("")} style={styles.attachBtn}>
                  <Text style={styles.btnText}>✕</Text>
                </Pressable>
              </View>
            )}

            {/* Composer */}
            <View style={styles.composer}>
              <TextInput
                value={attachmentUrl}
                onChangeText={setAttachmentUrl}
                placeholder="📎 URL"
                placeholderTextColor={C.muted}
                style={styles.attachInput}
                autoCapitalize="none"
              />
              <TextInput
                value={composerText}
                onChangeText={(next) => {
                  setComposerText(next);
                  if (auth && activeChannelId && next.trim() && socketRef.current) {
                    socketRef.current.emit(REALTIME_EVENTS.TYPING, { roomId: activeChannelId, userId: auth.user.id });
                  }
                }}
                placeholder="Nachricht schreiben…"
                placeholderTextColor={C.muted}
                style={styles.composerInput}
                multiline
                maxLength={2000}
              />
              <Pressable
                style={[styles.composerSend, !composerText.trim() && styles.composerSendDisabled]}
                onPress={onSend}
                disabled={!composerText.trim()}
              >
                <Text style={styles.composerSendIcon}>➤</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ── Members panel ──────────────────────────────────── */}
        {panel === "members" && (
          <View style={styles.panelContainer}>
            <FlatList
              data={channelMembers}
              keyExtractor={(item) => item.userId}
              style={{ flex: 1 }}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.memberItem}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.avatarLetter}>
                      {item.user.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName}>{item.user.displayName}</Text>
                    <Text style={styles.memberSub}>@{item.user.username} · {item.role}</Text>
                  </View>
                  <View style={styles.memberActions}>
                    {canManageRoles && item.role !== "OWNER" && item.userId !== auth.user.id && (
                      <Pressable style={styles.tagBtn} onPress={() => onTransferOwnership(item)}>
                        <Text style={styles.tagBtnText}>👑</Text>
                      </Pressable>
                    )}
                    {canManageRoles && item.role !== "OWNER" && item.userId !== auth.user.id && (
                      <Pressable style={styles.tagBtn} onPress={() => onToggleMemberRole(item)}>
                        <Text style={styles.tagBtnText}>{item.role === "ADMIN" ? "Member" : "Admin"}</Text>
                      </Pressable>
                    )}
                    {canModerateMembers && item.role !== "OWNER" && item.userId !== auth.user.id && (
                      <Pressable style={styles.tagBtnDanger} onPress={() => onRemoveMember(item)}>
                        <Text style={styles.tagBtnText}>✕</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>Keine Mitglieder gefunden.</Text>
                </View>
              }
            />
            <View style={styles.memberFooter}>
              <Pressable
                style={[styles.btnSecondary, ownRole === "OWNER" && { opacity: 0.4 }]}
                onPress={onLeaveGroup}
                disabled={ownRole === "OWNER"}
              >
                <Text style={styles.btnText}>Gruppe verlassen</Text>
              </Pressable>
              {ownRole === "OWNER" && (
                <Pressable style={styles.btnDanger} onPress={onDeleteGroup}>
                  <Text style={styles.btnText}>Gruppe löschen</Text>
                </Pressable>
              )}
            </View>
            {ownRole === "OWNER" && (
              <Text style={styles.ownerNote}>
                Übertrage den Owner, bevor du die Gruppe verlässt.
              </Text>
            )}
          </View>
        )}

        {/* ── Search panel ───────────────────────────────────── */}
        {panel === "search" && (
          <View style={styles.panelContainer}>
            <View style={styles.inputRow}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Nachrichten durchsuchen…"
                placeholderTextColor={C.muted}
                style={[styles.input, { flex: 1 }]}
                autoFocus
                returnKeyType="search"
                onSubmitEditing={onSearch}
              />
              <Pressable style={styles.btnPrimary} onPress={onSearch}>
                <Text style={styles.btnText}>🔍</Text>
              </Pressable>
            </View>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => `s-${item.id}`}
              style={{ flex: 1 }}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.searchResult}
                  onPress={() => {
                    setPanel("chat");
                  }}
                >
                  <Text style={styles.searchResultSender}>{item.sender.displayName}</Text>
                  <Text style={styles.searchResultText} numberOfLines={2}>{item.content}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                searchQuery.length > 1 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyTitle}>Keine Ergebnisse.</Text>
                  </View>
                ) : (
                  <View style={styles.empty}>
                    <Text style={styles.emptyIcon}>🔍</Text>
                    <Text style={styles.emptyHint}>Suchbegriff eingeben und suchen.</Text>
                  </View>
                )
              }
            />
          </View>
        )}

        {/* ── Toast message ──────────────────────────────────── */}
        {!!message && (
          <Pressable style={styles.toast} onPress={() => setMessage("")}>
            <Text style={styles.toastText}>{message}</Text>
            <Text style={styles.toastClose}>✕</Text>
          </Pressable>
        )}
      </SafeAreaView>
    );
  }

  // ─── Auth screen ─────────────────────────────────────────────────────────
  const modeLabels: Record<Mode, string> = {
    login: "Anmelden",
    register: "Registrieren",
    forgot: "Passwort vergessen",
    reset: "Passwort zurücksetzen"
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.authOuter}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.authCard}>
          <Image source={chatNetLogo} style={styles.authLogo} resizeMode="contain" />
          <Text style={styles.authAppName}>Chat-Net</Text>
          <Text style={styles.authTagline}>chat-net.tech</Text>

          {/* Mode tabs */}
          <View style={styles.authTabs}>
            {(["login", "register", "forgot", "reset"] as Mode[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => setMode(item)}
                style={[styles.authTab, mode === item && styles.authTabActive]}
              >
                <Text style={[styles.authTabText, mode === item && styles.authTabTextActive]}>
                  {item === "login" ? "Login" : item === "register" ? "Register" : item === "forgot" ? "Forgot" : "Reset"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.authModeLabel}>{modeLabels[mode]}</Text>

          {(mode === "login" || mode === "register" || mode === "forgot") && (
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>E-Mail</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="deine@email.de"
                placeholderTextColor={C.muted}
                style={styles.authInput}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          )}

          {(mode === "login" || mode === "register" || mode === "reset") && (
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Passwort</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={C.muted}
                style={styles.authInput}
                secureTextEntry
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </View>
          )}

          {mode === "register" && (
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Anzeigename</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Dein Name"
                placeholderTextColor={C.muted}
                style={styles.authInput}
              />
            </View>
          )}

          {mode === "reset" && (
            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Reset-Token</Text>
              <TextInput
                value={token}
                onChangeText={setToken}
                placeholder="Token aus der E-Mail"
                placeholderTextColor={C.muted}
                style={styles.authInput}
                autoCapitalize="none"
              />
            </View>
          )}

          <Pressable style={styles.authBtnPrimary} onPress={submit}>
            <Text style={styles.authBtnText}>{modeLabels[mode]}</Text>
          </Pressable>

          <View style={styles.authDivider}>
            <View style={styles.authDividerLine} />
            <Text style={styles.authDividerText}>oder</Text>
            <View style={styles.authDividerLine} />
          </View>

          <Pressable style={styles.authBtnGoogle} onPress={google}>
            <Text style={styles.authBtnGoogleText}>Mit Google fortfahren</Text>
          </Pressable>

          {!!message && <Text style={styles.authMessage}>{message}</Text>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Design tokens ───────────────────────────────────────────────────────────
const C = {
  base:     "#02080f",
  bg1:      "#060e1e",
  bg2:      "#0b1628",
  bg3:      "#101f38",
  surface:  "#111c35",
  border:   "#1a2d4e",
  accent:   "#0ea5e9",
  accent2:  "#06b6d4",
  text:     "#e4e8f5",
  sub:      "#8899bb",
  muted:    "#4d6080",
  danger:   "#ef4444",
  white:    "#ffffff",
};

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: C.base },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg1,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  headerLogo:     { width: 30, height: 30 },
  headerBack:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerBackText: { fontSize: 28, color: C.accent, fontWeight: "300", lineHeight: 32 },
  headerCenter:   { flex: 1 },
  headerTitle:    { color: C.text, fontSize: 16, fontWeight: "700" },
  headerSub:      { color: C.sub, fontSize: 12, marginTop: 1 },
  headerRight:    { flexDirection: "row", gap: 4 },
  headerBtn:      { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderRadius: 10 },
  headerBtnIcon:  { fontSize: 16 },

  // ── Panel container ──────────────────────────────────────────────────────
  panelContainer: { flex: 1, paddingTop: 10 },
  listContent:    { paddingHorizontal: 14, paddingBottom: 16, gap: 6 },

  // ── Inputs ──────────────────────────────────────────────────────────────
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.bg3,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
  },

  // ── Buttons ─────────────────────────────────────────────────────────────
  btnPrimary: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondary: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDanger: {
    backgroundColor: C.danger,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText:    { color: C.white, fontWeight: "700", fontSize: 14 },

  // ── Channel list ────────────────────────────────────────────────────────
  channelItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  channelItemActive: {
    backgroundColor: C.bg3,
    borderColor: C.accent,
  },
  channelIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.bg2,
    alignItems: "center",
    justifyContent: "center",
  },
  channelIconText:      { fontSize: 18 },
  channelName:          { color: C.text, fontSize: 14, fontWeight: "600" },
  channelNameActive:    { color: C.accent },
  channelMeta:          { color: C.muted, fontSize: 12, marginTop: 2 },
  channelActiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.accent,
  },

  searchTabBtn: {
    margin: 14,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    alignItems: "center",
  },
  searchTabText: { color: C.sub, fontSize: 14 },

  // ── Empty states ────────────────────────────────────────────────────────
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 6,
  },
  emptyIcon:  { fontSize: 36, marginBottom: 4 },
  emptyTitle: { color: C.text, fontSize: 15, fontWeight: "600" },
  emptyHint:  { color: C.muted, fontSize: 13, textAlign: "center", paddingHorizontal: 24 },

  // ── Messages ────────────────────────────────────────────────────────────
  msgListContent: { padding: 14, gap: 12, paddingBottom: 8 },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  msgRowOwn: { flexDirection: "row-reverse" },
  avatarWrap: { width: 32, alignItems: "center" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.bg3,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarOwn:    { backgroundColor: C.accent, borderColor: C.accent },
  avatarLetter: { color: C.white, fontSize: 12, fontWeight: "700" },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    borderWidth: 1.5,
    borderColor: C.base,
    marginTop: 2,
  },
  msgContent:    { flex: 1, gap: 2 },
  msgContentOwn: { alignItems: "flex-end" },
  msgSender:     { color: C.accent, fontSize: 11, fontWeight: "700", marginBottom: 2, paddingHorizontal: 12 },
  bubble: {
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    maxWidth: "90%",
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  bubbleOwn: {
    backgroundColor: C.accent,
    borderColor: C.accent2,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
    borderWidth: 0,
  },
  bubbleOther: {},
  bubbleText:    { color: C.text, fontSize: 14, lineHeight: 20 },
  bubbleTextOwn: { color: C.white },
  msgActions: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    marginTop: 2,
  },
  msgAction:    { fontSize: 13, opacity: 0.6 },
  editRow:      { flexDirection: "row", alignItems: "center", gap: 6 },

  // ── Typing bar ──────────────────────────────────────────────────────────
  typingBar: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    backgroundColor: C.bg1,
  },
  typingText:  { color: C.muted, fontSize: 12, fontStyle: "italic" },

  // ── Attachment bar ──────────────────────────────────────────────────────
  attachBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg2,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 8,
  },
  attachLabel: { fontSize: 14 },
  attachUrl:   { flex: 1, color: C.sub, fontSize: 12 },
  attachBtn: {
    backgroundColor: C.surface,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  // ── Composer ────────────────────────────────────────────────────────────
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: C.bg1,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  attachInput: {
    width: 72,
    backgroundColor: C.bg3,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 9,
    color: C.sub,
    fontSize: 12,
  },
  composerInput: {
    flex: 1,
    backgroundColor: C.bg3,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: C.text,
    fontSize: 14,
    maxHeight: 100,
  },
  composerSend: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  composerSendDisabled: { backgroundColor: C.bg3 , opacity: 0.5 },
  composerSendIcon: { color: C.white, fontSize: 16, fontWeight: "700" },

  // ── Members panel ────────────────────────────────────────────────────────
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.bg3,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  memberName:    { color: C.text, fontSize: 14, fontWeight: "600" },
  memberSub:     { color: C.muted, fontSize: 12, marginTop: 1 },
  memberActions: { flexDirection: "row", gap: 6 },
  tagBtn: {
    backgroundColor: C.bg2,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.border,
  },
  tagBtnDanger: {
    backgroundColor: "#2a1010",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#4a1818",
  },
  tagBtnText:   { color: C.text, fontSize: 12, fontWeight: "600" },
  memberFooter: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    flexWrap: "wrap",
  },
  ownerNote: {
    color: C.muted,
    fontSize: 12,
    paddingHorizontal: 14,
    paddingBottom: 12,
    textAlign: "center",
  },

  // ── Search panel ────────────────────────────────────────────────────────
  searchResult: {
    backgroundColor: C.surface,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchResultSender: { color: C.accent, fontSize: 12, fontWeight: "700" },
  searchResultText:   { color: C.text, fontSize: 13, lineHeight: 18 },

  // ── Toast ────────────────────────────────────────────────────────────────
  toast: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.bg3,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  toastText:  { flex: 1, color: C.text, fontSize: 13 },
  toastClose: { color: C.muted, fontSize: 14, fontWeight: "700" },

  // ── Auth screen ──────────────────────────────────────────────────────────
  authOuter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  authCard: {
    width: "100%",
    backgroundColor: C.bg2,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    padding: 28,
    alignItems: "center",
    gap: 0,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 10,
  },
  authLogo:    { width: 72, height: 72, marginBottom: 12 },
  authAppName: { color: C.text, fontSize: 26, fontWeight: "800", letterSpacing: 0.5 },
  authTagline: { color: C.muted, fontSize: 13, marginTop: 2, marginBottom: 20 },

  authTabs: {
    flexDirection: "row",
    backgroundColor: C.bg1,
    borderRadius: 12,
    padding: 3,
    gap: 2,
    marginBottom: 20,
  },
  authTab: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
  },
  authTabActive:     { backgroundColor: C.accent },
  authTabText:       { color: C.muted, fontSize: 11, fontWeight: "600" },
  authTabTextActive: { color: C.white },

  authModeLabel: {
    color: C.sub,
    fontSize: 14,
    fontWeight: "600",
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  fieldWrap:    { width: "100%", gap: 5, marginBottom: 12 },
  fieldLabel:   { color: C.sub, fontSize: 12, fontWeight: "600", marginLeft: 4 },
  authInput: {
    width: "100%",
    backgroundColor: C.bg3,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: C.text,
    fontSize: 14,
  },
  authBtnPrimary: {
    width: "100%",
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  authBtnText: { color: C.white, fontSize: 15, fontWeight: "800" },

  authDivider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 10,
    marginVertical: 16,
  },
  authDividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  authDividerText: { color: C.muted, fontSize: 12 },

  authBtnGoogle: {
    width: "100%",
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 13,
    alignItems: "center",
  },
  authBtnGoogleText: { color: C.text, fontSize: 14, fontWeight: "700" },
  authMessage:       { color: C.accent, fontSize: 13, marginTop: 14, textAlign: "center" },
});
