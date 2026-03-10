import { useState } from "react";
import type { ChangeEvent, KeyboardEvent, MutableRefObject, ReactNode } from "react";
import type { AuthResponse } from "@chatnet/shared";
import type { ChannelItem, ChannelMemberItem, MessageItem, PollItem } from "../lib/api";

type MentionCandidate = {
  username: string;
  displayName: string;
};

type ChatLayoutProps = {
  auth: AuthResponse;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onLogout: () => void;
  realtimeState: "connecting" | "online" | "offline";
  currentUserIsPlatformOwner: boolean;
  renderPlatformOwnerBadge: (userId?: string, username?: string) => ReactNode;
  renderCustomBadges: (userId?: string) => ReactNode;
  isMobileLayout: boolean;
  mobilePane: "list" | "chat";
  setMobilePane: (next: "list" | "chat") => void;
  channels: ChannelItem[];
  sortedChannels: ChannelItem[];
  activeChannel: ChannelItem | null;
  activeChannelId: string | null;
  ownMembershipRole: "OWNER" | "ADMIN" | "MEMBER" | null;
  channelMembers: ChannelMemberItem[];
  canManageRoles: boolean;
  canModerateMembers: boolean;
  onOpenCreateChannelModal: () => void;
  onOpenDirectModal: () => void;
  onOpenAddMemberModal: () => void;
  openChannel: (channelId: string) => void;
  getChannelDisplayName: (channel: ChannelItem | null) => string;
  getChannelTypeLabel: (channel: ChannelItem) => string;
  formatTimeLabel: (value?: string) => string;
  unreadByChannelId: Record<string, number>;
  onTransferOwnership: (member: ChannelMemberItem) => void;
  onToggleMemberRole: (member: ChannelMemberItem) => void;
  onRemoveMember: (member: ChannelMemberItem) => void;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  onSearch: () => void;
  onSummarizeChannel: () => void;
  summaryLoading: boolean;
  polls: PollItem[];
  pollLoading: boolean;
  onCreatePoll: () => void;
  onVotePoll: (pollId: string, optionId: string) => void;
  searchResults: MessageItem[];
  activeConversationStatus: string;
  voiceSupported: boolean;
  voiceCallState: "idle" | "connecting" | "active";
  voiceParticipants: number;
  isVoiceMuted: boolean;
  onStartVoiceCall: () => void;
  onLeaveVoiceCall: () => void;
  onToggleVoiceMute: () => void;
  messages: MessageItem[];
  replyingToMessageId: string | null;
  onReplyToMessage: (messageId: string) => void;
  onCancelReply: () => void;
  messageListRef: MutableRefObject<HTMLDivElement | null>;
  activeMessageId: string | null;
  setActiveMessageId: (id: string | null | ((current: string | null) => string | null)) => void;
  presenceMap: Record<string, boolean>;
  memberRoleByUserId: Map<string, "OWNER" | "ADMIN" | "MEMBER">;
  editingMessageId: string | null;
  editingContent: string;
  setEditingContent: (value: string) => void;
  onSaveEdit: (messageId: string) => void;
  onEditMessage: (entry: MessageItem) => void;
  onDeleteMessage: (messageId: string) => void;
  onBlockSender: (senderId: string) => void;
  renderContentWithMentions: (content: string) => ReactNode;
  composerText: string;
  composerRef: MutableRefObject<HTMLTextAreaElement | null>;
  onComposerChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onComposerKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  mentionQuery: string | null;
  filteredMentionCandidates: MentionCandidate[];
  mentionIndex: number;
  insertMention: (username: string) => void;
  onSendMessage: () => void;
  uploadsEnabledForAll: boolean;
  onUploadSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  voiceNoteSupported: boolean;
  voiceNoteState: "idle" | "recording" | "uploading";
  onStartVoiceNote: () => void;
  onStopVoiceNote: () => void;
  message: string;
  mentionNotice: string;
  settingsOpen: boolean;
  setSettingsOpen: (value: boolean) => void;
  settingsTab: "profile" | "owner";
  setSettingsTab: (value: "profile" | "owner") => void;
  profileNickname: string;
  setProfileNickname: (value: string) => void;
  profileUsername: string;
  setProfileUsername: (value: string) => void;
  onSaveProfile: () => void;
  knownUsers: Array<{ id: string; username?: string; displayName: string }>;
  badgeTargetUserId: string;
  setBadgeTargetUserId: (value: string) => void;
  badgeTargetUser: { id: string; username?: string; displayName: string } | null;
  badgeDefinitions: Array<{ id: string; label: string }>;
  customBadgesByUserId: Record<string, string[]>;
  toggleBadgeForUser: (userId: string, badge: string) => void;
  newBadgeLabel: string;
  setNewBadgeLabel: (value: string) => void;
  newBadgeShortLabel: string;
  setNewBadgeShortLabel: (value: string) => void;
  createCustomBadge: () => void;
  canManagePlatformSettings: boolean;
  uploadsEnabled: boolean;
  platformToggleLoading: boolean;
  onToggleGlobalUploads: (enabled: boolean) => void;
  createChannelModalOpen: boolean;
  setCreateChannelModalOpen: (value: boolean) => void;
  newChannelName: string;
  setNewChannelName: (value: string) => void;
  onCreateChannelFromModal: () => void;
  directModalOpen: boolean;
  setDirectModalOpen: (value: boolean) => void;
  directUsername: string;
  setDirectUsername: (value: string) => void;
  onStartDirectByUsername: () => void;
  addMemberModalOpen: boolean;
  setAddMemberModalOpen: (value: boolean) => void;
  addMemberUsername: string;
  setAddMemberUsername: (value: string) => void;
  onAddMemberByUsername: () => void;
};

export function ChatLayout({
  auth,
  theme,
  onToggleTheme,
  onLogout,
  realtimeState,
  currentUserIsPlatformOwner,
  renderPlatformOwnerBadge,
  renderCustomBadges,
  isMobileLayout,
  mobilePane,
  setMobilePane,
  channels,
  sortedChannels,
  activeChannel,
  activeChannelId,
  ownMembershipRole,
  channelMembers,
  canManageRoles,
  canModerateMembers,
  onOpenCreateChannelModal,
  onOpenDirectModal,
  onOpenAddMemberModal,
  openChannel,
  getChannelDisplayName,
  getChannelTypeLabel,
  formatTimeLabel,
  unreadByChannelId,
  onTransferOwnership,
  onToggleMemberRole,
  onRemoveMember,
  onLeaveGroup,
  onDeleteGroup,
  searchQuery,
  setSearchQuery,
  onSearch,
  onSummarizeChannel,
  summaryLoading,
  polls,
  pollLoading,
  onCreatePoll,
  onVotePoll,
  searchResults,
  activeConversationStatus,
  voiceSupported,
  voiceCallState,
  voiceParticipants,
  isVoiceMuted,
  onStartVoiceCall,
  onLeaveVoiceCall,
  onToggleVoiceMute,
  messages,
  replyingToMessageId,
  onReplyToMessage,
  onCancelReply,
  messageListRef,
  activeMessageId,
  setActiveMessageId,
  presenceMap,
  memberRoleByUserId,
  editingMessageId,
  editingContent,
  setEditingContent,
  onSaveEdit,
  onEditMessage,
  onDeleteMessage,
  onBlockSender,
  renderContentWithMentions,
  composerText,
  composerRef,
  onComposerChange,
  onComposerKeyDown,
  mentionQuery,
  filteredMentionCandidates,
  mentionIndex,
  insertMention,
  onSendMessage,
  uploadsEnabledForAll,
  onUploadSelected,
  voiceNoteSupported,
  voiceNoteState,
  onStartVoiceNote,
  onStopVoiceNote,
  message,
  mentionNotice,
  settingsOpen,
  setSettingsOpen,
  settingsTab,
  setSettingsTab,
  profileNickname,
  setProfileNickname,
  profileUsername,
  setProfileUsername,
  onSaveProfile,
  knownUsers,
  badgeTargetUserId,
  setBadgeTargetUserId,
  badgeTargetUser,
  badgeDefinitions,
  customBadgesByUserId,
  toggleBadgeForUser,
  newBadgeLabel,
  setNewBadgeLabel,
  newBadgeShortLabel,
  setNewBadgeShortLabel,
  createCustomBadge,
  canManagePlatformSettings,
  uploadsEnabled,
  platformToggleLoading,
  onToggleGlobalUploads,
  createChannelModalOpen,
  setCreateChannelModalOpen,
  newChannelName,
  setNewChannelName,
  onCreateChannelFromModal,
  directModalOpen,
  setDirectModalOpen,
  directUsername,
  setDirectUsername,
  onStartDirectByUsername,
  addMemberModalOpen,
  setAddMemberModalOpen,
  addMemberUsername,
  setAddMemberUsername,
  onAddMemberByUsername
}: ChatLayoutProps) {
  const [showSearch, setShowSearch] = useState(false);

  const AVATAR_PALETTE = ["#0ea5e9", "#06b6d4", "#8b5cf6", "#ec4899", "#f97316", "#22c55e", "#f59e0b", "#64748b"];
  function getInitials(name: string): string {
    return name.split(" ").map((w) => w[0]?.toUpperCase() ?? "").slice(0, 2).join("") || "?";
  }
  function avatarColor(id: string): string {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = ((h * 31) + id.charCodeAt(i)) >>> 0;
    return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
  }

  const enrichedMessages = messages.map((entry, idx) => {
    const prev = messages[idx - 1];
    const sameAuthor = prev?.sender.id === entry.sender.id;
    const withinWindow = prev
      ? (new Date(entry.createdAt ?? "").getTime() - new Date(prev.createdAt ?? "").getTime()) < 5 * 60_000
      : false;
    return { ...entry, isGroupStart: !sameAuthor || !withinWindow };
  });

  return (
    <main className="app-shell chat-app-shell">
      <section className={isMobileLayout && mobilePane === "chat" ? "chat-shell mobile-chat-focus" : "chat-shell"}>
        {/* ─── Global Topbar ─── */}
        <header className="chat-topbar">
          <div className="brand-block">
            <img src="/chat-net-logo.svg" alt="Chat-Net Logo" className="brand-logo" />
            <h1>Chat-Net</h1>
          </div>
          <div className="user-block">
            <span
              className={realtimeState === "online" ? "realtime-pill online" : realtimeState === "connecting" ? "realtime-pill connecting" : "realtime-pill offline"}
              aria-live="polite"
            >
              {realtimeState === "online" ? "● Live" : realtimeState === "connecting" ? "Verbinde\u2026" : "\u25CB Offline"}
            </span>
            <div className="user-chip">
              <div className="chip-avatar" style={{ background: avatarColor(auth.user.id) }}>
                {getInitials(auth.user.displayName)}
                <span className="chip-presence" />
              </div>
              <div className="chip-info">
                <span className="chip-display">
                  {auth.user.displayName}
                  {renderPlatformOwnerBadge(auth.user.id, auth.user.username)}
                  {renderCustomBadges(auth.user.id)}
                </span>
                <small className="chip-handle">@{auth.user.username}</small>
              </div>
            </div>
            <div className="topbar-actions">
              <button className="icon-btn" title={theme === "dark" ? "Helles Design" : "Dunkles Design"} onClick={onToggleTheme}>
                {theme === "dark" ? "\u2600" : "\u263E"}
              </button>
              {currentUserIsPlatformOwner && (
                <button className="icon-btn" title="Owner Men\u00FC" onClick={() => { setSettingsTab("owner"); setSettingsOpen(true); }}>
                  \u2699
                </button>
              )}
              <button className="icon-btn" title="Einstellungen" onClick={() => { setSettingsTab("profile"); setSettingsOpen(true); }}>
                \u25CE
              </button>
              <button className="icon-btn danger-btn" title="Abmelden" onClick={onLogout}>
                \u23FB
              </button>
            </div>
          </div>
        </header>

        {/* ─── Main Layout ─── */}
        <div
          className={
            isMobileLayout
              ? mobilePane === "chat"
                ? "chat-layout mobile-chat-open"
                : "chat-layout mobile-list-open"
              : "chat-layout"
          }
        >
          {/* ── Left: Channel Sidebar ── */}
          <aside className="panel channel-panel">
            <div className="sidebar-section-header">
              <span className="sidebar-section-label">Kan\u00E4le</span>
              <span className="sidebar-count">{channels.length}</span>
            </div>

            <div className="channel-toolbar">
              <button className="sidebar-action-btn" onClick={onOpenCreateChannelModal} title="Neue Gruppe erstellen">
                <span className="sab-icon">+</span>
                <span>Gruppe</span>
              </button>
              <button className="sidebar-action-btn" onClick={onOpenDirectModal} title="Direktnachricht starten">
                <span className="sab-icon">\u2709</span>
                <span>DM</span>
              </button>
                {activeChannel?.type === "GROUP" && !activeChannel?.isSystem && (
                  <button className="sidebar-action-btn" onClick={onOpenAddMemberModal} disabled={ownMembershipRole !== "OWNER"} title="Mitglied hinzuf\u00FCgen">
                    <span className="sab-icon">\uD83D\uDC64</span>
                    <span>Hinzuf\u00FCgen</span>
                  </button>
                )}
            </div>

            <div className="channel-items">
              {sortedChannels.map((channel) => {
                const unreadCount = unreadByChannelId[channel.id] ?? 0;
                const isDirect = channel.type === "DIRECT";
                const displayName = getChannelDisplayName(channel);
                const hasUnread = unreadCount > 0;
                return (
                  <button
                    key={channel.id}
                    className={
                      channel.id === activeChannelId
                        ? "channel-item active"
                        : hasUnread
                          ? "channel-item unread"
                          : "channel-item"
                    }
                    data-channel-id={channel.id}
                    onClick={() => openChannel(channel.id)}
                  >
                    <div className="ch-avatar" style={{ background: channel.isSystem ? "var(--accent)" : avatarColor(channel.id) }}>
                      {channel.isSystem ? "📣" : getInitials(displayName)}
                    </div>
                    <div className="channel-main">
                      <span className={hasUnread && channel.id !== activeChannelId ? "channel-name unread-name" : "channel-name"}>
                        {displayName}
                      </span>
                      <small className="channel-subline">
                        {channel.isSystem ? "Ankündigungen" : isDirect ? "Direktnachricht" : "Gruppe"}
                      </small>
                    </div>
                    {hasUnread && (
                      <span className="channel-unread">{unreadCount > 99 ? "99+" : unreadCount}</span>
                    )}
                  </button>
                );
              })}
              {!channels.length && <p className="empty-hint">Noch keine Kan\u00E4le vorhanden.</p>}
            </div>
          </aside>

          {/* ── Center: Message Panel ── */}
          <section className="panel message-panel">
            {/* Room Header */}
            <div className="chat-room-header">
              {isMobileLayout && (
                <button className="icon-btn" aria-label="Zur\u00FCck zur Kanalliste" onClick={() => setMobilePane("list")}>
                  \u2190
                </button>
              )}
              <div className="chat-room-meta">
                {activeChannel && (
                  <div className="room-avatar" style={{ background: activeChannel.isSystem ? "var(--accent)" : avatarColor(activeChannel.id) }}>
                    {activeChannel.isSystem ? "\uD83D\uDCE3" : getInitials(getChannelDisplayName(activeChannel))}
                  </div>
                )}
                <div className="room-info">
                  <h3>
                    {getChannelDisplayName(activeChannel)}
                    {activeChannel?.isSystem && <span className="system-channel-badge">Offiziel</span>}
                  </h3>
                  <span>
                    {activeChannel?.isSystem ? "Nur das Team kann schreiben" : activeConversationStatus}
                    {voiceCallState !== "idle" ? ` \u00B7 \uD83D\uDD0A ${voiceParticipants} aktiv` : ""}
                  </span>
                </div>
              </div>
              <div className="room-actions">
                {voiceSupported && activeChannelId ? (
                  voiceCallState === "idle" ? (
                    <button className="icon-btn" title="Sprachanruf starten" onClick={onStartVoiceCall}>\uD83C\uDF99</button>
                  ) : (
                    <>
                      <button
                        className={isVoiceMuted ? "icon-btn danger-btn" : "icon-btn active-btn"}
                        title={isVoiceMuted ? "Mikrofon einschalten" : "Stumm schalten"}
                        onClick={onToggleVoiceMute}
                      >
                        {isVoiceMuted ? "\uD83D\uDD07" : "\uD83C\uDF99"}
                      </button>
                      <button className="icon-btn danger-btn" title="Sprachanruf verlassen" onClick={onLeaveVoiceCall}>\uD83D\uDCF5</button>
                    </>
                  )
                ) : null}
                <button
                  className={showSearch ? "icon-btn active-btn" : "icon-btn"}
                  title="Suchen"
                  onClick={() => setShowSearch(!showSearch)}
                >
                  \uD83D\uDD0D
                </button>
                {activeChannel && (
                  <span className="chat-room-type-pill">
                    {activeChannel.isSystem ? "\uD83D\uDCE3 Systemnachrichten" : activeChannel.type === "GROUP" ? "Gruppe" : "Direkt"}
                  </span>
                )}
              </div>
            </div>

            {/* Collapsible Search Bar */}
            {showSearch && (
              <div className="search-row">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Nachrichten durchsuchen\u2026"
                  autoFocus
                />
                <button className="secondary compact" onClick={onSearch}>Suchen</button>
                <button className="secondary compact" onClick={onSummarizeChannel} disabled={!activeChannelId || summaryLoading}>
                  {summaryLoading ? "L\u00E4dt\u2026" : "AI-Zusammenfassung"}
                </button>
                <button className="secondary compact" onClick={onCreatePoll} disabled={!activeChannelId || pollLoading}>
                  {pollLoading ? "L\u00E4dt\u2026" : "Umfrage erstellen"}
                </button>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.slice(0, 5).map((entry) => (
                  <p key={`search-${entry.id}`} className="result-item">
                    <strong>{entry.sender.displayName}:</strong> {entry.content}
                  </p>
                ))}
              </div>
            )}

            {/* Polls */}
            {polls.length > 0 && (
              <div className="poll-strip">
                {polls.slice(0, 3).map((poll) => (
                  <article key={poll.id} className="poll-card">
                    <p className="poll-question">{poll.question}</p>
                    <div className="poll-options">
                      {poll.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={poll.votedOptionId === option.id ? "poll-option active" : "poll-option"}
                          onClick={() => onVotePoll(poll.id, option.id)}
                          disabled={poll.isClosed}
                        >
                          <span className="poll-label">{option.label}</span>
                          <strong className="poll-count">{option.voteCount}</strong>
                        </button>
                      ))}
                    </div>
                    <small className="poll-total">{poll.totalVotes} Stimmen{poll.isClosed ? " \u00B7 Geschlossen" : ""}</small>
                  </article>
                ))}
              </div>
            )}

            {/* Message List */}
            <div className="message-list" ref={messageListRef}>
              {enrichedMessages.map((entry) => {
                const ownMessage = entry.sender.id === auth.user.id;
                const showActions = activeMessageId === entry.id;
                const isOnline = Boolean(presenceMap[entry.sender.id]);
                const role = memberRoleByUserId.get(entry.sender.id);
                const color = avatarColor(entry.sender.id);
                const voiceMatch = entry.content.match(/^\[voice\]\s+(https?:\/\/\S+)$/i);
                const voiceUrl = voiceMatch?.[1] ?? null;
                const isReplyingToEntry = replyingToMessageId === entry.id;

                return (
                  <article
                    key={entry.id}
                    className={[
                      "msg-row",
                      ownMessage ? "mine" : "",
                      entry.isGroupStart ? "group-start" : "group-cont",
                      showActions ? "selected" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => setActiveMessageId((current) => (current === entry.id ? null : entry.id))}
                  >
                    <div className="msg-avatar-col">
                      {entry.isGroupStart && !ownMessage ? (
                        <div className="msg-avatar" style={{ background: color }}>
                          {getInitials(entry.sender.displayName)}
                          {isOnline && <span className="msg-presence-dot" />}
                        </div>
                      ) : null}
                    </div>
                    <div className="msg-body">
                      {entry.isGroupStart && !ownMessage && (
                        <div className="msg-header">
                          <span className="msg-author" style={{ color }}>{entry.sender.displayName}</span>
                          {renderPlatformOwnerBadge(entry.sender.id, entry.sender.username)}
                          {renderCustomBadges(entry.sender.id)}
                          {role === "ADMIN" && <span className="role-pill">Admin</span>}
                        </div>
                      )}

                      {editingMessageId === entry.id ? (
                        <div className="edit-row">
                          <input
                            value={editingContent}
                            onChange={(event) => setEditingContent(event.target.value)}
                            placeholder="Bearbeitete Nachricht"
                            autoFocus
                          />
                          <button className="primary compact" onClick={() => onSaveEdit(entry.id)}>\u2713</button>
                          <button className="secondary compact" onClick={() => onEditMessage(entry)}>\u2715</button>
                        </div>
                      ) : (
                        <div className="msg-bubble">
                          {voiceUrl ? (
                            <div className="voice-message-wrap">
                              <audio controls preload="none" src={voiceUrl} className="voice-message-player" />
                            </div>
                          ) : (
                            <>
                              {entry.replyTo && (
                                <div className="reply-preview">
                                  <strong>{entry.replyTo.sender.displayName}</strong>
                                  <span>{entry.replyTo.content}</span>
                                </div>
                              )}
                              <p className="message-content">{renderContentWithMentions(entry.content)}</p>
                              {entry.content.startsWith("http") && !voiceUrl && (
                                <a className="file-link" href={entry.content} target="_blank" rel="noreferrer">
                                  Datei \u00F6ffnen \u2197
                                </a>
                              )}
                            </>
                          )}
                          <span className="bubble-time">{formatTimeLabel(entry.createdAt)}</span>
                        </div>
                      )}

                      {isReplyingToEntry && (
                        <small className="inline-note replying-note">Antwort wird verfasst\u2026</small>
                      )}

                      {/* Floating action bar */}
                      <div className={showActions ? "msg-actions visible" : "msg-actions"}>
                        <button
                          className="msg-action-btn"
                          onClick={(e) => { e.stopPropagation(); onReplyToMessage(entry.id); }}
                          title="Antworten"
                        >
                          \u21A9
                        </button>
                        {ownMessage ? (
                          <>
                            <button
                              className="msg-action-btn"
                              onClick={(e) => { e.stopPropagation(); onEditMessage(entry); }}
                              title="Bearbeiten"
                            >
                              \u270E
                            </button>
                            <button
                              className="msg-action-btn danger"
                              onClick={(e) => { e.stopPropagation(); onDeleteMessage(entry.id); }}
                              title="L\u00F6schen"
                            >
                              \uD83D\uDDD1
                            </button>
                          </>
                        ) : (
                          <button
                            className="msg-action-btn danger"
                            onClick={(e) => { e.stopPropagation(); onBlockSender(entry.sender.id); }}
                            title="Blockieren"
                          >
                            \uD83D\uDEAB
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}

              {!messages.length && (
                <div className="empty-state">
                  <div className="empty-state-icon">\uD83D\uDCAC</div>
                  <p>
                    {activeChannel
                      ? `Willkommen${activeChannel.type === "GROUP" ? " in " + getChannelDisplayName(activeChannel) : ", " + getChannelDisplayName(activeChannel)}!`
                      : "Chat auswählen"}
                  </p>
                  <span>
                    {activeChannel
                      ? "Noch keine Nachrichten. Schreib die erste!"
                      : "W\u00E4hle links einen Kanal aus, um zu beginnen."}
                  </span>
                </div>
              )}
            </div>

            {/* Composer – locked for non-owners in system channels */}
            {activeChannel?.isSystem && !currentUserIsPlatformOwner ? (
              <div className="system-composer-lock">
                <span className="system-lock-icon">🔒</span>
                <span>Nur das Team kann in diesem Kanal schreiben.</span>
              </div>
            ) : (
            <div className="composer">
              <div className="composer-side-actions">
                <label
                  className={uploadsEnabledForAll ? "composer-icon-btn" : "composer-icon-btn disabled"}
                  htmlFor="upload-input"
                  title="Datei anh\u00E4ngen"
                  aria-label="Datei anh\u00E4ngen"
                >
                  \uD83D\uDCCE
                </label>
                <input id="upload-input" className="file-input" type="file" onChange={onUploadSelected} disabled={!uploadsEnabledForAll} />
                {voiceNoteSupported && (
                  <button
                    className={
                      voiceNoteState === "uploading"
                        ? "composer-icon-btn disabled"
                        : voiceNoteState === "recording"
                          ? "composer-icon-btn recording"
                          : "composer-icon-btn"
                    }
                    onClick={voiceNoteState === "recording" ? onStopVoiceNote : onStartVoiceNote}
                    title={voiceNoteState === "recording" ? "Aufnahme stoppen" : "Sprachnachricht aufnehmen"}
                    disabled={voiceNoteState === "uploading"}
                    type="button"
                  >
                    {voiceNoteState === "recording" ? "\u23F9" : "\uD83C\uDF99"}
                  </button>
                )}
              </div>
              <div className="composer-input-wrap">
                {replyingToMessageId ? (
                  <div className="reply-banner">
                    <span>\u21A9 Antwort auf Nachricht</span>
                    <button type="button" className="secondary compact" onClick={onCancelReply}>\u2715</button>
                  </div>
                ) : null}
                <textarea
                  ref={composerRef}
                  value={composerText}
                  onChange={onComposerChange}
                  onKeyDown={onComposerKeyDown}
                  placeholder={
                    activeChannel
                      ? `Nachricht an ${getChannelDisplayName(activeChannel)}…`
                      : "Nachricht schreiben\u2026"
                  }
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
                        <div className="mention-avatar" style={{ background: avatarColor(item.username) }}>
                          {getInitials(item.displayName)}
                        </div>
                        <div>
                          <span>@{item.username}</span>
                          <small>{item.displayName}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="composer-send"
                onClick={onSendMessage}
                title="Senden"
                aria-label="Senden"
              >
                <span className="composer-icon">➤</span>
              </button>
            </div>
            )}

          </section>

          {/* Members panel removed – managed via modal */}
        </div>

        {message && <p className="message-banner">{message}</p>}
        {mentionNotice && <p className="message-banner mention-banner">{mentionNotice}</p>}

        {settingsOpen && (
          <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
            <section
              className="modal-panel settings-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Einstellungen"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="settings-head">
                <h3>Einstellungen</h3>
                <button className="secondary compact" onClick={() => setSettingsOpen(false)}>
                  {"Schlie\u00DFen"}
                </button>
              </div>

              <p className="settings-intro">Profile, Rollen und Plattform-Optionen zentral verwalten.</p>

              <div className="settings-tabs">
                <button className={settingsTab === "profile" ? "settings-tab active" : "settings-tab"} onClick={() => setSettingsTab("profile")}>
                  Profil
                </button>
                {currentUserIsPlatformOwner && (
                  <button className={settingsTab === "owner" ? "settings-tab active" : "settings-tab"} onClick={() => setSettingsTab("owner")}>
                    Owner
                  </button>
                )}
              </div>

              {settingsTab === "profile" && (
                <div className="profile-grid">
                  <label>
                    Nickname
                    <input value={profileNickname} onChange={(event) => setProfileNickname(event.target.value)} placeholder="Dein Nickname" />
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
                  <button className="primary compact" onClick={onSaveProfile}>
                    Profil speichern
                  </button>
                </div>
              )}

              {settingsTab === "owner" && currentUserIsPlatformOwner && (
                <div className="owner-studio owner-studio-in-settings">
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
                            <input type="checkbox" checked={active} onChange={() => toggleBadgeForUser(badgeTargetUser.id, badge.id)} />
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
                      <button className="secondary compact" onClick={createCustomBadge}>
                        Badge erstellen
                      </button>
                    </div>
                  </div>

                  {canManagePlatformSettings && (
                    <div className="owner-studio-create">
                      <p className="inline-note">Globale Plattform-Einstellungen</p>
                      <div className="owner-studio-toggle-row">
                        <button className={uploadsEnabled ? "primary compact" : "secondary compact"} disabled={platformToggleLoading} onClick={() => onToggleGlobalUploads(true)}>
                          {"Uploads f\u00FCr alle AN"}
                        </button>
                        <button className={!uploadsEnabled ? "primary compact" : "secondary compact"} disabled={platformToggleLoading} onClick={() => onToggleGlobalUploads(false)}>
                          {"Uploads f\u00FCr alle AUS"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {createChannelModalOpen && (
          <div className="modal-backdrop" onClick={() => setCreateChannelModalOpen(false)}>
            <section className="modal-panel" role="dialog" aria-modal="true" aria-label="Neuen Kanal erstellen" onClick={(event) => event.stopPropagation()}>
              <h3>Neuen Kanal erstellen</h3>
              <input value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} placeholder="Neuer Gruppenchat" />
              <div className="modal-actions">
                <button className="secondary compact" onClick={() => setCreateChannelModalOpen(false)}>
                  Abbrechen
                </button>
                <button className="primary compact" onClick={onCreateChannelFromModal}>
                  Erstellen
                </button>
              </div>
            </section>
          </div>
        )}

        {directModalOpen && (
          <div className="modal-backdrop" onClick={() => setDirectModalOpen(false)}>
            <section className="modal-panel" role="dialog" aria-modal="true" aria-label="Direktchat starten" onClick={(event) => event.stopPropagation()}>
              <h3>Direktchat starten</h3>
              <input
                value={directUsername}
                onChange={(event) => setDirectUsername(event.target.value.toLowerCase())}
                placeholder="@username"
                type="text"
              />
              <div className="modal-actions">
                <button className="secondary compact" onClick={() => setDirectModalOpen(false)}>
                  Abbrechen
                </button>
                <button className="primary compact" onClick={onStartDirectByUsername}>
                  Starten
                </button>
              </div>
            </section>
          </div>
        )}

        {addMemberModalOpen && (
          <div className="modal-backdrop" onClick={() => setAddMemberModalOpen(false)}>
            <section className="modal-panel" role="dialog" aria-modal="true" aria-label={"Person hinzuf\u00FCgen"} onClick={(event) => event.stopPropagation()}>
              <h3>{"Person zu"} {getChannelDisplayName(activeChannel)} {"hinzuf\u00FCgen"}</h3>
              <input
                value={addMemberUsername}
                onChange={(event) => setAddMemberUsername(event.target.value.toLowerCase())}
                placeholder="@username"
                type="text"
              />
              <p className="inline-note">{"Nur Owner k\u00F6nnen neue Mitglieder hinzuf\u00FCgen."}</p>
              <div className="modal-actions">
                <button className="secondary compact" onClick={() => setAddMemberModalOpen(false)}>
                  Abbrechen
                </button>
                <button className="primary compact" onClick={onAddMemberByUsername}>
                  {"Hinzuf\u00FCgen"}
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
