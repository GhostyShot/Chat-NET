import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { AuthResponse } from "@chatnet/shared";
import { io, type Socket } from "socket.io-client";
import { API_URL, api, type ChannelItem, type ChannelMemberItem, type MessageItem } from "./api";

type Mode = "login" | "register" | "forgot" | "reset" | "verify";

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
  const socketRef = useRef<Socket | null>(null);
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageItem[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [channelMembers, setChannelMembers] = useState<ChannelMemberItem[]>([]);

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

    const socket: Socket = io(API_URL, {
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

    const onTyping = (payload: { roomId: string; userId: string }) => {
      if (!activeChannelId || payload.roomId !== activeChannelId || payload.userId === auth.user.id) {
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
        const data = await api.forgot(email);
        setMessage(`Reset Token (dev): ${data.resetToken}`);
      }
      if (mode === "reset") {
        await api.reset(token, password);
        setMessage("Passwort aktualisiert");
      }
      if (mode === "verify") {
        await api.verify(token);
        setMessage("E-Mail verifiziert");
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

  if (auth) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Chat-Net</Text>
              <Text style={styles.subtitle}>
                {auth.user.displayName}
                {ownRole === "OWNER" ? "  👑 OWNER" : ""}
              </Text>
            </View>
            <Pressable
              style={styles.secondary}
              onPress={() => {
                setAuth(null);
                setChannels([]);
                setMessages([]);
                setActiveChannelId(null);
              }}
            >
              <Text style={styles.primaryText}>Logout</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Channels</Text>
          <View style={styles.newChannelRow}>
            <TextInput
              value={newChannelName}
              onChangeText={setNewChannelName}
              placeholder="Neuer Gruppenname"
              placeholderTextColor="#9fb0e3"
              style={[styles.input, styles.inputFlex]}
            />
            <Pressable style={styles.primary} onPress={onCreateChannel}>
              <Text style={styles.primaryText}>Erstellen</Text>
            </Pressable>
          </View>

          <View style={styles.newChannelRow}>
            <TextInput
              value={inviteUsername}
              onChangeText={(value) => setInviteUsername(value.toLowerCase())}
              placeholder="@username"
              placeholderTextColor="#9fb0e3"
              style={[styles.input, styles.inputFlex]}
            />
            <Pressable style={styles.secondary} onPress={onStartDirectByUsername}>
              <Text style={styles.primaryText}>Direkt</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={onAddMemberByUsername}
              disabled={!activeChannel || activeChannel.type !== "GROUP"}
            >
              <Text style={styles.primaryText}>Add</Text>
            </Pressable>
          </View>

          {activeChannel?.type === "GROUP" && (
            <View style={styles.messagesBox}>
              <Text style={styles.sectionTitle}>Mitglieder</Text>
              {channelMembers.map((member) => (
                <View key={member.userId} style={styles.memberRow}>
                  <View style={styles.inputFlex}>
                    <Text style={styles.channelText}>{member.user.displayName}</Text>
                    <Text style={styles.messageMeta}>@{member.user.username} • {member.role}</Text>
                  </View>
                  {canManageRoles && member.role !== "OWNER" && member.userId !== auth.user.id && (
                    <Pressable style={styles.secondarySmall} onPress={() => onTransferOwnership(member)}>
                      <Text style={styles.primaryText}>Owner</Text>
                    </Pressable>
                  )}
                  {canManageRoles && member.role !== "OWNER" && member.userId !== auth.user.id && (
                    <Pressable style={styles.secondarySmall} onPress={() => onToggleMemberRole(member)}>
                      <Text style={styles.primaryText}>{member.role === "ADMIN" ? "Member" : "Admin"}</Text>
                    </Pressable>
                  )}
                  {canModerateMembers && member.role !== "OWNER" && member.userId !== auth.user.id && (
                    <Pressable style={styles.secondarySmall} onPress={() => onRemoveMember(member)}>
                      <Text style={styles.primaryText}>Entfernen</Text>
                    </Pressable>
                  )}
                </View>
              ))}
              <View style={styles.newChannelRow}>
                <Pressable style={styles.secondary} onPress={onLeaveGroup} disabled={ownRole === "OWNER"}>
                  <Text style={styles.primaryText}>Gruppe verlassen</Text>
                </Pressable>
                {ownRole === "OWNER" && (
                  <Pressable style={styles.secondary} onPress={onDeleteGroup}>
                    <Text style={styles.primaryText}>Gruppe löschen</Text>
                  </Pressable>
                )}
              </View>
              {ownRole === "OWNER" && (
                <Text style={styles.subtitle}>Übertrage erst den Owner an ein anderes Mitglied.</Text>
              )}
            </View>
          )}

          <View style={styles.channelWrap}>
            {channels.map((channel) => (
              <Pressable
                key={channel.id}
                onPress={() => setActiveChannelId(channel.id)}
                style={channel.id === activeChannelId ? styles.channelActive : styles.channelItem}
              >
                <Text style={styles.channelText}>
                  {channel.name ?? (channel.type === "DIRECT" ? "Direktchat" : "Unbenannt")}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Nachrichten</Text>
          <View style={styles.newChannelRow}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Nachrichten durchsuchen"
              placeholderTextColor="#9fb0e3"
              style={[styles.input, styles.inputFlex]}
            />
            <Pressable style={styles.secondary} onPress={onSearch}>
              <Text style={styles.primaryText}>Suchen</Text>
            </Pressable>
          </View>

          {!!searchResults.length && (
            <View style={styles.messagesBox}>
              {searchResults.slice(0, 5).map((entry) => (
                <Text key={`search-${entry.id}`} style={styles.subtitle}>
                  {entry.sender.displayName}: {entry.content}
                </Text>
              ))}
            </View>
          )}

          <View style={styles.messagesBox}>
            {messages.map((entry) => (
              <View key={entry.id} style={styles.messageItem}>
                <Text style={styles.messageMeta}>
                  {entry.sender.displayName}
                  {memberRoleByUserId.get(entry.sender.id) === "OWNER" ? " 👑" : ""}
                  {memberRoleByUserId.get(entry.sender.id) === "ADMIN" ? " ⭐" : ""} {presenceMap[entry.sender.id] ? "• online" : "• offline"}
                </Text>
                {editingMessageId === entry.id ? (
                  <View style={styles.newChannelRow}>
                    <TextInput
                      value={editingContent}
                      onChangeText={setEditingContent}
                      placeholder="Nachricht bearbeiten"
                      placeholderTextColor="#9fb0e3"
                      style={[styles.input, styles.inputFlex]}
                    />
                    <Pressable style={styles.primary} onPress={() => onSaveEdit(entry.id)}>
                      <Text style={styles.primaryText}>Speichern</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={styles.messageText}>{entry.content}</Text>
                )}
                {entry.sender.id !== auth.user.id && (
                  <Pressable style={styles.secondary} onPress={() => onBlock(entry.sender.id)}>
                    <Text style={styles.primaryText}>Blockieren</Text>
                  </Pressable>
                )}
                {entry.sender.id === auth.user.id && (
                  <View style={styles.newChannelRow}>
                    <Pressable
                      style={styles.secondary}
                      onPress={() => {
                        setEditingMessageId(entry.id);
                        setEditingContent(entry.content);
                      }}
                    >
                      <Text style={styles.primaryText}>Bearbeiten</Text>
                    </Pressable>
                    <Pressable style={styles.secondary} onPress={() => onDelete(entry.id)}>
                      <Text style={styles.primaryText}>Löschen</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
            {!messages.length && <Text style={styles.subtitle}>Noch keine Nachrichten.</Text>}
          </View>

          <View style={styles.newChannelRow}>
            <TextInput
              value={attachmentUrl}
              onChangeText={setAttachmentUrl}
              placeholder="Datei-URL anhängen"
              placeholderTextColor="#9fb0e3"
              style={[styles.input, styles.inputFlex]}
            />
            <Pressable style={styles.secondary} onPress={onAttachUrl}>
              <Text style={styles.primaryText}>Anhängen</Text>
            </Pressable>
          </View>

          <View style={styles.newChannelRow}>
            <TextInput
              value={composerText}
              onChangeText={(next) => {
                setComposerText(next);
                if (auth && activeChannelId && next.trim() && socketRef.current) {
                  socketRef.current.emit("typing", { roomId: activeChannelId, userId: auth.user.id });
                }
              }}
              placeholder="Nachricht schreiben"
              placeholderTextColor="#9fb0e3"
              style={[styles.input, styles.inputFlex]}
            />
            <Pressable style={styles.primary} onPress={onSend}>
              <Text style={styles.primaryText}>Senden</Text>
            </Pressable>
          </View>

          {!!typingHint && <Text style={styles.subtitle}>{typingHint}</Text>}

          {!!message && <Text style={styles.message}>{message}</Text>}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Chat-Net</Text>
        <Text style={styles.subtitle}>chat-net.tech</Text>

        <View style={styles.row}>
          {(["login", "register", "forgot", "reset", "verify"] as Mode[]).map((item) => (
            <Pressable key={item} onPress={() => setMode(item)} style={styles.tab}>
              <Text style={styles.tabText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        {(mode === "login" || mode === "register" || mode === "forgot") && (
          <TextInput value={email} onChangeText={setEmail} placeholder="E-Mail" placeholderTextColor="#9fb0e3" style={styles.input} />
        )}

        {(mode === "login" || mode === "register" || mode === "reset") && (
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Passwort"
            placeholderTextColor="#9fb0e3"
            style={styles.input}
          />
        )}

        {mode === "register" && (
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Anzeigename"
            placeholderTextColor="#9fb0e3"
            style={styles.input}
          />
        )}

        {(mode === "verify" || mode === "reset") && (
          <TextInput value={token} onChangeText={setToken} placeholder="Token" placeholderTextColor="#9fb0e3" style={styles.input} />
        )}

        <Pressable style={styles.primary} onPress={submit}>
          <Text style={styles.primaryText}>Absenden</Text>
        </Pressable>

        <Pressable style={styles.secondary} onPress={google}>
          <Text style={styles.primaryText}>Mit Google fortfahren</Text>
        </Pressable>

        {!!message && <Text style={styles.message}>{message}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b1020" },
  container: { padding: 20, gap: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  title: { fontSize: 28, color: "#fff", fontWeight: "700" },
  subtitle: { color: "#9fb0e3", marginBottom: 12 },
  sectionTitle: { color: "#dce5ff", fontSize: 16, fontWeight: "700", marginTop: 6 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: { backgroundColor: "#1c2b52", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  tabText: { color: "#dce5ff", fontSize: 12, textTransform: "capitalize" },
  input: {
    backgroundColor: "#132147",
    borderWidth: 1,
    borderColor: "#2f4788",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff"
  },
  inputFlex: { flex: 1 },
  primary: { backgroundColor: "#3a71ff", borderRadius: 10, padding: 12, alignItems: "center" },
  secondary: { backgroundColor: "#1e2c57", borderRadius: 10, padding: 12, alignItems: "center" },
  secondarySmall: { backgroundColor: "#1e2c57", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, alignItems: "center" },
  newChannelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  channelWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  channelItem: { backgroundColor: "#15244a", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  channelActive: { backgroundColor: "#2b4ea8", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  channelText: { color: "#fff", fontSize: 13 },
  messagesBox: {
    backgroundColor: "#0f1936",
    borderColor: "#294178",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
    minHeight: 180
  },
  messageItem: { backgroundColor: "#15244a", borderRadius: 10, padding: 8 },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#15244a",
    borderRadius: 10,
    padding: 8
  },
  messageMeta: { color: "#9fb0e3", fontSize: 12, marginBottom: 4 },
  messageText: { color: "#fff" },
  primaryText: { color: "#fff", fontWeight: "600" },
  message: { color: "#cfe0ff", marginTop: 8 }
});