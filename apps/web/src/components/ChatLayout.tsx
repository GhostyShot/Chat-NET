import type { ChangeEvent, KeyboardEvent, MutableRefObject, ReactNode } from "react";
import type { AuthResponse } from "@chatnet/shared";
import type { ChannelItem, ChannelMemberItem, MessageItem } from "../lib/api";

type MentionCandidate = {
  username: string;
  displayName: string;
};

type ChatLayoutProps = {
  auth: AuthResponse;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onLogout: () => void;
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
  searchResults: MessageItem[];
  activeConversationStatus: string;
  messages: MessageItem[];
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
  searchResults,
  activeConversationStatus,
  messages,
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
  return (
    <main className="app-shell chat-app-shell">
      <section className={isMobileLayout && mobilePane === "chat" ? "chat-shell mobile-chat-focus" : "chat-shell"}>
        <header className="chat-topbar">
          <div className="brand-block">
            <img src="/chat-net-logo.svg" alt="Chat-Net Logo" className="brand-logo" />
            <p className="eyebrow">chat-net.tech</p>
            <h1>Chat-Net</h1>
            <p className="subtitle">Der sichere Chat für echte Gespräche</p>
          </div>
          <div className="user-block">
            <button className="secondary" onClick={onToggleTheme}>
              {theme === "dark" ? "Hell" : "Dunkel"}
            </button>
            <div className="user-chip">
              <span className="status-dot" />
              <span>
                {auth.user.displayName}
                {renderPlatformOwnerBadge(auth.user.id, auth.user.username)}
                {renderCustomBadges(auth.user.id)}
                <small className="chip-handle">@{auth.user.username}</small>
              </span>
            </div>
            {currentUserIsPlatformOwner && (
              <button
                className="secondary"
                onClick={() => {
                  setSettingsTab("owner");
                  setSettingsOpen(true);
                }}
              >
                Owner Menü
              </button>
            )}
            <button
              className="secondary"
              onClick={() => {
                setSettingsTab("profile");
                setSettingsOpen(true);
              }}
            >
              Einstellungen
            </button>
            <button className="secondary" onClick={onLogout}>
              Abmelden
            </button>
          </div>
        </header>

        <div
          className={
            isMobileLayout
              ? mobilePane === "chat"
                ? "chat-layout mobile-chat-open"
                : "chat-layout mobile-list-open"
              : "chat-layout"
          }
        >
          <aside className="panel channel-panel">
            <div className="panel-header">
              <h3>Kanäle</h3>
              <span>{channels.length}</span>
            </div>

            <div className="channel-toolbar">
              <button className="secondary compact" onClick={onOpenCreateChannelModal}>
                Neuer Kanal
              </button>
              <button className="secondary compact" onClick={onOpenDirectModal}>
                Direktchat
              </button>
              {activeChannel?.type === "GROUP" && (
                <button className="secondary compact" onClick={onOpenAddMemberModal} disabled={ownMembershipRole !== "OWNER"}>
                  Person hinzufügen
                </button>
              )}
            </div>

            {activeChannel?.type === "GROUP" && (
              <div className="member-panel">
                <div className="panel-header">
                  <h3>Mitglieder</h3>
                  <span>{channelMembers.length}</span>
                </div>
                <div className="member-list">
                  {channelMembers.map((member) => {
                    const isSelf = member.userId === auth.user.id;
                    return (
                      <div key={member.userId} className="member-item">
                        <div>
                          <p className="member-name">
                            {member.user.displayName}
                            {renderPlatformOwnerBadge(member.userId, member.user.username)}
                            {renderCustomBadges(member.userId)}
                          </p>
                          <p className="member-meta">
                            @{member.user.username} • {member.role}
                          </p>
                        </div>
                        <div className="member-actions">
                          {canManageRoles && member.role !== "OWNER" && !isSelf && (
                            <button className="secondary compact" onClick={() => onTransferOwnership(member)}>
                              Owner geben
                            </button>
                          )}
                          {canManageRoles && member.role !== "OWNER" && !isSelf && (
                            <button className="secondary compact" onClick={() => onToggleMemberRole(member)}>
                              {member.role === "ADMIN" ? "Zu Member" : "Zu Admin"}
                            </button>
                          )}
                          {canModerateMembers && member.role !== "OWNER" && !isSelf && (
                            <button className="secondary compact" onClick={() => onRemoveMember(member)}>
                              Entfernen
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!channelMembers.length && <p className="inline-note">Keine Mitgliederdaten verfügbar.</p>}
                </div>
                <div className="member-actions member-footer-actions">
                  <button className="secondary compact" onClick={onLeaveGroup} disabled={ownMembershipRole === "OWNER"}>
                    Gruppe verlassen
                  </button>
                  {ownMembershipRole === "OWNER" && (
                    <button className="secondary compact" onClick={onDeleteGroup}>
                      Gruppe löschen
                    </button>
                  )}
                </div>
                {ownMembershipRole === "OWNER" && (
                  <p className="inline-note">Übertrage erst den Owner an ein anderes Mitglied, bevor du die Gruppe verlässt.</p>
                )}
              </div>
            )}

            <div className="channel-items">
              {sortedChannels.map((channel) => {
                const unreadCount = unreadByChannelId[channel.id] ?? 0;
                return (
                  <button
                    key={channel.id}
                    className={channel.id === activeChannelId ? "channel-item active" : "channel-item"}
                    onClick={() => openChannel(channel.id)}
                  >
                    <div className="channel-main">
                      <span className="channel-name">{getChannelDisplayName(channel)}</span>
                      <small className="channel-subline">Letzte Aktivität {formatTimeLabel(channel.updatedAt)}</small>
                    </div>
                    <div className="channel-side">
                      <span className="channel-kind">{getChannelTypeLabel(channel)}</span>
                      {unreadCount > 0 ? <span className="channel-unread">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
                    </div>
                  </button>
                );
              })}
              {!channels.length && <p className="empty-hint">Noch keine Kanäle vorhanden.</p>}
            </div>
          </aside>

          <section className="panel message-panel">
            <div className="chat-room-header">
              {isMobileLayout && (
                <button className="secondary compact mobile-back" onClick={() => setMobilePane("list")}>
                  ←
                </button>
              )}
              <div className="chat-room-meta">
                <h3>{getChannelDisplayName(activeChannel)}</h3>
                <span>{activeConversationStatus}</span>
              </div>
              {activeChannel ? (
                <span className="chat-room-type-pill">{activeChannel.type === "GROUP" ? "Gruppe" : "Direkt"}</span>
              ) : null}
            </div>

            <div className="search-row">
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Nachrichten durchsuchen" />
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

            <div className="message-list" ref={messageListRef}>
              {messages.map((entry) => {
                const ownMessage = entry.sender.id === auth.user.id;
                const showActions = activeMessageId === entry.id;
                const isOnline = Boolean(presenceMap[entry.sender.id]);
                const role = memberRoleByUserId.get(entry.sender.id);
                const timeLabel = formatTimeLabel(entry.createdAt);
                return (
                  <article
                    key={entry.id}
                    className={ownMessage ? "message-bubble mine" : "message-bubble"}
                    onClick={() => setActiveMessageId((current) => (current === entry.id ? null : entry.id))}
                  >
                    <div className="message-head">
                      <div className="message-author-line">
                        <p className="message-meta">
                          {entry.sender.displayName}
                          {entry.sender.username ? <span className="message-handle">@{entry.sender.username}</span> : null}
                          {renderPlatformOwnerBadge(entry.sender.id, entry.sender.username)}
                          {renderCustomBadges(entry.sender.id)}
                        </p>
                        <div className="message-badges-row">
                          {role === "ADMIN" ? <span className="role-pill">Admin</span> : null}
                          <span className={isOnline ? "presence-pill online" : "presence-pill offline"}>{isOnline ? "Online" : "Offline"}</span>
                          {timeLabel ? <span className="message-time">{timeLabel}</span> : null}
                        </div>
                      </div>
                    </div>

                    {editingMessageId === entry.id ? (
                      <div className="edit-row">
                        <input value={editingContent} onChange={(event) => setEditingContent(event.target.value)} placeholder="Neue Nachricht" />
                        <button className="primary" onClick={() => onSaveEdit(entry.id)}>
                          Speichern
                        </button>
                      </div>
                    ) : (
                      <p className="message-content">{renderContentWithMentions(entry.content)}</p>
                    )}

                    {entry.content.startsWith("http") && (
                      <a className="file-link" href={entry.content} target="_blank" rel="noreferrer">
                        Datei öffnen
                      </a>
                    )}

                    {ownMessage ? (
                      <div className={showActions ? "message-actions visible" : "message-actions"}>
                        <button className="message-action-chip" onClick={() => onEditMessage(entry)} title="Bearbeiten" aria-label="Bearbeiten">
                          ✎
                        </button>
                        <button className="message-action-chip delete" onClick={() => onDeleteMessage(entry.id)} title="Löschen" aria-label="Löschen">
                          🗑
                        </button>
                      </div>
                    ) : (
                      <button
                        className={showActions ? "message-inline-action visible" : "message-inline-action"}
                        onClick={() => onBlockSender(entry.sender.id)}
                        title="Blockieren"
                        aria-label="Blockieren"
                      >
                        🚫
                      </button>
                    )}
                  </article>
                );
              })}

              {!messages.length && (
                <div className="empty-state">
                  <p>Noch keine Nachrichten in diesem Kanal.</p>
                  <span>Starte die Unterhaltung mit deiner ersten Nachricht.</span>
                </div>
              )}
            </div>

            <div className="composer">
              <label
                className={uploadsEnabledForAll ? "upload-button" : "upload-button disabled"}
                htmlFor="upload-input"
                title="Datei anhängen"
                aria-label="Datei anhängen"
              >
                <span className="composer-icon">+</span>
              </label>
              <input id="upload-input" className="file-input" type="file" onChange={onUploadSelected} disabled={!uploadsEnabledForAll} />
              <div className="composer-input-wrap">
                <textarea
                  ref={composerRef}
                  value={composerText}
                  onChange={onComposerChange}
                  onKeyDown={onComposerKeyDown}
                  placeholder="Nachricht schreiben (Enter senden, Shift+Enter Zeilenumbruch)"
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
                        <span>@{item.username}</span>
                        <small>{item.displayName}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="primary composer-send" onClick={onSendMessage} title="Senden" aria-label="Senden">
                <span className="composer-icon">➤</span>
              </button>
            </div>
          </section>
        </div>

        {message && <p className="message-banner">{message}</p>}
        {mentionNotice && <p className="message-banner mention-banner">{mentionNotice}</p>}

        {settingsOpen && (
          <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
            <section className="modal-panel settings-panel" onClick={(event) => event.stopPropagation()}>
              <div className="settings-head">
                <h3>Einstellungen</h3>
                <button className="secondary compact" onClick={() => setSettingsOpen(false)}>
                  Schließen
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
                  <button className="primary" onClick={onSaveProfile}>
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
                      <button className="secondary" onClick={createCustomBadge}>
                        Badge erstellen
                      </button>
                    </div>
                  </div>

                  {canManagePlatformSettings && (
                    <div className="owner-studio-create">
                      <p className="inline-note">Globale Plattform-Einstellungen</p>
                      <div className="owner-studio-toggle-row">
                        <button className={uploadsEnabled ? "primary" : "secondary"} disabled={platformToggleLoading} onClick={() => onToggleGlobalUploads(true)}>
                          Uploads für alle AN
                        </button>
                        <button className={!uploadsEnabled ? "primary" : "secondary"} disabled={platformToggleLoading} onClick={() => onToggleGlobalUploads(false)}>
                          Uploads für alle AUS
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
            <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
              <h3>Neuen Kanal erstellen</h3>
              <input value={newChannelName} onChange={(event) => setNewChannelName(event.target.value)} placeholder="Neuer Gruppenchat" />
              <div className="modal-actions">
                <button className="secondary" onClick={() => setCreateChannelModalOpen(false)}>
                  Abbrechen
                </button>
                <button className="primary" onClick={onCreateChannelFromModal}>
                  Erstellen
                </button>
              </div>
            </section>
          </div>
        )}

        {directModalOpen && (
          <div className="modal-backdrop" onClick={() => setDirectModalOpen(false)}>
            <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
              <h3>Direktchat starten</h3>
              <input
                value={directUsername}
                onChange={(event) => setDirectUsername(event.target.value.toLowerCase())}
                placeholder="@username"
                type="text"
              />
              <div className="modal-actions">
                <button className="secondary" onClick={() => setDirectModalOpen(false)}>
                  Abbrechen
                </button>
                <button className="primary" onClick={onStartDirectByUsername}>
                  Starten
                </button>
              </div>
            </section>
          </div>
        )}

        {addMemberModalOpen && (
          <div className="modal-backdrop" onClick={() => setAddMemberModalOpen(false)}>
            <section className="modal-panel" onClick={(event) => event.stopPropagation()}>
              <h3>Person zu {getChannelDisplayName(activeChannel)} hinzufügen</h3>
              <input
                value={addMemberUsername}
                onChange={(event) => setAddMemberUsername(event.target.value.toLowerCase())}
                placeholder="@username"
                type="text"
              />
              <p className="inline-note">Nur Owner können neue Mitglieder hinzufügen.</p>
              <div className="modal-actions">
                <button className="secondary" onClick={() => setAddMemberModalOpen(false)}>
                  Abbrechen
                </button>
                <button className="primary" onClick={onAddMemberByUsername}>
                  Hinzufügen
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
