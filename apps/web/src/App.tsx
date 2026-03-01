import { useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import type { AuthResponse } from "@chatnet/shared";
import { io, type Socket } from "socket.io-client";
import {
  API_URL,
  addGroupMemberByEmail,
  blockUser,
  createDirectByEmail,
  createGroupChannel,
  deleteMessage,
  forgotPassword,
  getPresence,
  listChannels,
  listMessages,
  login,
  loginWithGoogle,
  markRead,
  searchMessages,
  register,
  resetPassword,
  sendMessage,
  updateMessage,
  uploadFile,
  verifyEmail,
  type ChannelItem,
  type MessageItem
} from "./lib/api";

type Mode = "login" | "register" | "forgot" | "reset" | "verify";

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
  const [message, setMessage] = useState("");
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(false);
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);

  const activeChannel = useMemo(
    () => channels.find((channel) => channel.id === activeChannelId) ?? null,
    [channels, activeChannelId]
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("chat-net-theme", theme);
  }, [theme]);

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
    if (auth || !googleClientId || !googleButtonRef.current) {
      setGoogleReady(false);
      return;
    }

    let cancelled = false;

    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) {
        return;
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
        theme: "outline",
        size: "large",
        text: "continue_with",
        shape: "pill",
        width: 320
      });
      window.google.accounts.id.prompt();
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => {
        cancelled = true;
      };
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", renderGoogleButton);
      return () => {
        cancelled = true;
        existingScript.removeEventListener("load", renderGoogleButton);
      };
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.addEventListener("load", renderGoogleButton);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", renderGoogleButton);
    };
  }, [auth]);

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
        const resetToken = await forgotPassword(email);
        setMessage(`Reset token (dev): ${resetToken}`);
      }
      if (mode === "reset") {
        await resetPassword(token, password);
        setMessage("Passwort wurde aktualisiert.");
      }
      if (mode === "verify") {
        await verifyEmail(token);
        setMessage("E-Mail wurde verifiziert.");
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

  const onStartDirectByEmail = async () => {
    if (!auth || !inviteEmail.trim()) {
      return;
    }

    try {
      const channel = await createDirectByEmail(auth.tokens.accessToken, inviteEmail.trim());
      setChannels((previous) => {
        if (previous.some((entry) => entry.id === channel.id)) {
          return previous;
        }
        return [channel, ...previous];
      });
      setActiveChannelId(channel.id);
      setInviteEmail("");
      setMessage("Direktchat wurde erstellt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Direktchat konnte nicht erstellt werden");
    }
  };

  const onAddMemberByEmail = async () => {
    if (!auth || !activeChannelId || !activeChannel || activeChannel.type !== "GROUP" || !inviteEmail.trim()) {
      return;
    }

    try {
      await addGroupMemberByEmail(auth.tokens.accessToken, activeChannelId, inviteEmail.trim());
      setInviteEmail("");
      setMessage("Person wurde zur Gruppe hinzugefügt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Person konnte nicht hinzugefügt werden");
    }
  };

  const onComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void onSendMessage();
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
  };

  if (auth) {
    return (
      <main className="app-shell">
        <section className="chat-shell">
          <header className="chat-topbar">
            <div className="brand-block">
              <p className="eyebrow">chat-net.tech</p>
              <h1>Chat-Net</h1>
              <p className="subtitle">Modern chat for real conversations</p>
            </div>
            <div className="user-block">
              <button
                className="secondary"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? "Light" : "Dark"}
              </button>
              <div className="user-chip">
                <span className="status-dot" />
                <span>{auth.user.displayName}</span>
              </div>
              <button className="secondary" onClick={logout}>
                Logout
              </button>
            </div>
          </header>

          <div className="chat-layout">
            <aside className="panel channel-panel">
              <div className="panel-header">
                <h3>Channels</h3>
                <span>{channels.length}</span>
              </div>

              <div className="new-channel-row">
                <input
                  value={newChannelName}
                  onChange={(event) => setNewChannelName(event.target.value)}
                  placeholder="Neuer Gruppenchat"
                />
                <button className="primary" onClick={onCreateChannel}>
                  +
                </button>
              </div>

              <div className="invite-box">
                <input
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="person@email.de"
                  type="email"
                />
                <button className="secondary" onClick={onStartDirectByEmail}>
                  Direktchat
                </button>
                <button
                  className="secondary"
                  onClick={onAddMemberByEmail}
                  disabled={!activeChannel || activeChannel.type !== "GROUP"}
                >
                  Zur Gruppe
                </button>
                <p className="inline-note">Für "Zur Gruppe" musst du Owner eines Gruppenchats sein.</p>
              </div>

              <div className="channel-items">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    className={channel.id === activeChannelId ? "channel-item active" : "channel-item"}
                    onClick={() => setActiveChannelId(channel.id)}
                  >
                    <span>{channel.name ?? (channel.type === "DIRECT" ? "Direktchat" : "Unbenannt")}</span>
                    <small>{channel.type}</small>
                  </button>
                ))}
                {!channels.length && <p className="empty-hint">Noch keine Channels vorhanden.</p>}
              </div>
            </aside>

            <section className="panel message-panel">
              <div className="panel-header">
                <h3>{activeChannel?.name ?? "Nachrichten"}</h3>
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

              <div className="message-list">
                {messages.map((entry) => {
                  const ownMessage = entry.sender.id === auth.user.id;
                  return (
                    <article key={entry.id} className={ownMessage ? "message-bubble mine" : "message-bubble"}>
                      <p className="message-meta">
                        {entry.sender.displayName} {presenceMap[entry.sender.id] ? "• online" : "• offline"}
                      </p>

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
                        <p className="message-content">{entry.content}</p>
                      )}

                      {entry.content.startsWith("http") && (
                        <a className="file-link" href={entry.content} target="_blank" rel="noreferrer">
                          Datei öffnen
                        </a>
                      )}

                      {ownMessage ? (
                        <div className="message-actions">
                          <button className="secondary" onClick={() => onEditMessage(entry)}>
                            Bearbeiten
                          </button>
                          <button className="secondary" onClick={() => onDeleteMessage(entry.id)}>
                            Löschen
                          </button>
                        </div>
                      ) : (
                        <button className="secondary compact" onClick={() => onBlockSender(entry.sender.id)}>
                          Blockieren
                        </button>
                      )}
                    </article>
                  );
                })}

                {!messages.length && (
                  <div className="empty-state">
                    <p>Noch keine Nachrichten in diesem Channel.</p>
                    <span>Starte die Unterhaltung mit deiner ersten Nachricht.</span>
                  </div>
                )}
              </div>

              <div className="composer">
                <label className="upload-button" htmlFor="upload-input">
                  Datei
                </label>
                <input id="upload-input" className="file-input" type="file" onChange={onUploadSelected} />
                <textarea
                  value={composerText}
                  onChange={(event) => {
                    const next = event.target.value;
                    setComposerText(next);
                    if (auth && activeChannelId && next.trim() && socketRef.current) {
                      socketRef.current.emit("typing", { roomId: activeChannelId, userId: auth.user.id });
                    }
                  }}
                  onKeyDown={onComposerKeyDown}
                  placeholder="Schreibe eine Nachricht... (Enter = senden, Shift+Enter = Zeilenumbruch)"
                />
                <button className="primary" onClick={onSendMessage}>
                  Senden
                </button>
              </div>
            </section>
          </div>

          {message && <p className="message-banner">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <p className="eyebrow">chat-net.tech</p>
          <h1>Chat-Net</h1>
          <p className="subtitle">Schnell, klar, modern – dein Space für Chats und Communities.</p>
        </div>

        <div className="auth-panel">
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
            <button className={mode === "reset" ? "tab active" : "tab"} onClick={() => setMode("reset")}>
              Passwort zurücksetzen
            </button>
            <button className={mode === "verify" ? "tab active" : "tab"} onClick={() => setMode("verify")}>
              E-Mail verifizieren
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

          {(mode === "login" || mode === "register" || mode === "reset") && (
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

          {(mode === "reset" || mode === "verify") && (
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
              {!googleReady && <p className="hint">Google Login wird geladen...</p>}
            </>
          ) : (
            <p className="hint">Setze in Vercel zusätzlich `VITE_GOOGLE_CLIENT_ID`, um Google Login zu aktivieren.</p>
          )}

          {message && <p className="message-banner">{message}</p>}
        </div>
      </section>
    </main>
  );
}