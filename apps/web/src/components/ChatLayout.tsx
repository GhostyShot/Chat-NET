import { useEffect, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, MutableRefObject, ReactNode } from 'react';
import type { AuthResponse } from '@chatnet/shared';
import type { ChannelItem, ChannelMemberItem, MessageItem, PollItem } from '../lib/api';
import { SearchModal } from './SearchModal';
import { ProfilePopup } from './ProfilePopup';

type MentionCandidate = { username: string; displayName: string };

type ChatLayoutProps = {
  auth: AuthResponse;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogout: () => void;
  realtimeState: 'connecting' | 'online' | 'offline';
  currentUserIsPlatformOwner: boolean;
  renderPlatformOwnerBadge: (userId?: string, username?: string) => ReactNode;
  renderCustomBadges: (userId?: string) => ReactNode;
  isMobileLayout: boolean;
  mobilePane: 'list' | 'chat';
  setMobilePane: (next: 'list' | 'chat') => void;
  channels: ChannelItem[];
  sortedChannels: ChannelItem[];
  activeChannel: ChannelItem | null;
  activeChannelId: string | null;
  ownMembershipRole: 'OWNER' | 'ADMIN' | 'MEMBER' | null;
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
  voiceCallState: 'idle' | 'connecting' | 'active';
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
  setActiveMessageId: (id: string | null | ((c: string | null) => string | null)) => void;
  presenceMap: Record<string, boolean>;
  memberRoleByUserId: Map<string, 'OWNER' | 'ADMIN' | 'MEMBER'>;
  editingMessageId: string | null;
  editingContent: string;
  setEditingContent: (v: string) => void;
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
  voiceNoteState: 'idle' | 'recording' | 'uploading';
  onStartVoiceNote: () => void;
  onStopVoiceNote: () => void;
  message: string;
  mentionNotice: string;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  settingsTab: 'profile' | 'owner';
  setSettingsTab: (v: 'profile' | 'owner') => void;
  profileNickname: string; setProfileNickname: (v: string) => void;
  profileUsername: string; setProfileUsername: (v: string) => void;
  onSaveProfile: () => void;
  knownUsers: Array<{ id: string; username?: string; displayName: string }>;
  badgeTargetUserId: string; setBadgeTargetUserId: (v: string) => void;
  badgeTargetUser: { id: string; username?: string; displayName: string } | null;
  badgeDefinitions: Array<{ id: string; label: string }>;
  customBadgesByUserId: Record<string, string[]>;
  toggleBadgeForUser: (userId: string, badge: string) => void;
  newBadgeLabel: string; setNewBadgeLabel: (v: string) => void;
  newBadgeShortLabel: string; setNewBadgeShortLabel: (v: string) => void;
  createCustomBadge: () => void;
  canManagePlatformSettings: boolean;
  uploadsEnabled: boolean;
  platformToggleLoading: boolean;
  onToggleGlobalUploads: (enabled: boolean) => void;
  createChannelModalOpen: boolean; setCreateChannelModalOpen: (v: boolean) => void;
  newChannelName: string; setNewChannelName: (v: string) => void;
  onCreateChannelFromModal: () => void;
  directModalOpen: boolean; setDirectModalOpen: (v: boolean) => void;
  directUsername: string; setDirectUsername: (v: string) => void;
  onStartDirectByUsername: () => void;
  addMemberModalOpen: boolean; setAddMemberModalOpen: (v: boolean) => void;
  addMemberUsername: string; setAddMemberUsername: (v: string) => void;
  onAddMemberByUsername: () => void;
};

const AVATAR_PALETTE = ['#525252','#404040','#737373','#a3a3a3','#71717a','#52525b','#3f3f46','#27272a'];
function getInitials(name: string) { return name.split(' ').map(w => w[0]?.toUpperCase() ?? '').slice(0, 2).join('') || '?'; }
function avatarColor(id: string) { let h = 0; for (let i = 0; i < id.length; i++) h = ((h * 31) + id.charCodeAt(i)) >>> 0; return AVATAR_PALETTE[h % AVATAR_PALETTE.length]; }

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😲', '👏', '🔥'];

export function ChatLayout(props: ChatLayoutProps) {
  const {
    auth, theme, onToggleTheme, onLogout, realtimeState,
    currentUserIsPlatformOwner, renderPlatformOwnerBadge, renderCustomBadges,
    isMobileLayout, mobilePane, setMobilePane,
    channels, sortedChannels, activeChannel, activeChannelId,
    ownMembershipRole, channelMembers, canManageRoles, canModerateMembers,
    onOpenCreateChannelModal, onOpenDirectModal, onOpenAddMemberModal,
    openChannel, getChannelDisplayName, getChannelTypeLabel, formatTimeLabel,
    unreadByChannelId, onTransferOwnership, onToggleMemberRole, onRemoveMember,
    onLeaveGroup, onDeleteGroup,
    searchQuery, setSearchQuery, onSearch, onSummarizeChannel, summaryLoading,
    polls, pollLoading, onCreatePoll, onVotePoll, searchResults,
    activeConversationStatus, voiceSupported, voiceCallState, voiceParticipants,
    isVoiceMuted, onStartVoiceCall, onLeaveVoiceCall, onToggleVoiceMute,
    messages, replyingToMessageId, onReplyToMessage, onCancelReply,
    messageListRef, activeMessageId, setActiveMessageId, presenceMap,
    memberRoleByUserId, editingMessageId, editingContent, setEditingContent,
    onSaveEdit, onEditMessage, onDeleteMessage, onBlockSender,
    renderContentWithMentions, composerText, composerRef,
    onComposerChange, onComposerKeyDown, mentionQuery,
    filteredMentionCandidates, mentionIndex, insertMention, onSendMessage,
    uploadsEnabledForAll, onUploadSelected, voiceNoteSupported, voiceNoteState,
    onStartVoiceNote, onStopVoiceNote,
    message, mentionNotice, settingsOpen, setSettingsOpen, settingsTab, setSettingsTab,
    profileNickname, setProfileNickname, profileUsername, setProfileUsername, onSaveProfile,
    knownUsers, badgeTargetUserId, setBadgeTargetUserId, badgeTargetUser,
    badgeDefinitions, customBadgesByUserId, toggleBadgeForUser,
    newBadgeLabel, setNewBadgeLabel, newBadgeShortLabel, setNewBadgeShortLabel, createCustomBadge,
    canManagePlatformSettings, uploadsEnabled, platformToggleLoading, onToggleGlobalUploads,
    createChannelModalOpen, setCreateChannelModalOpen, newChannelName, setNewChannelName, onCreateChannelFromModal,
    directModalOpen, setDirectModalOpen, directUsername, setDirectUsername, onStartDirectByUsername,
    addMemberModalOpen, setAddMemberModalOpen, addMemberUsername, setAddMemberUsername, onAddMemberByUsername,
  } = props;

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [showInlineSearch, setShowInlineSearch] = useState(false);
  const [unreadDismissed, setUnreadDismissed] = useState<Record<string, boolean>>({});
  const [reactions, setReactions] = useState<Record<string, Array<{ emoji: string; count: number; userIds: string[] }>>>({});
  const [profilePopup, setProfilePopup] = useState<{ user: { id: string; displayName: string; username?: string }; position: { x: number; y: number } } | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchModalOpen(true); }
      if (e.key === 'Escape') { setSearchModalOpen(false); setProfilePopup(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Reset unread dismissed when switching channels
  useEffect(() => { setUnreadDismissed(prev => ({ ...prev })); }, [activeChannelId]);

  const enriched = messages.map((entry, idx) => {
    const prev = messages[idx - 1];
    const sameAuthor = prev?.sender.id === entry.sender.id;
    const withinWindow = prev ? (new Date(entry.createdAt).getTime() - new Date(prev.createdAt).getTime()) < 5 * 60_000 : false;
    return { ...entry, isGroupStart: !sameAuthor || !withinWindow };
  });

  const totalUnread = activeChannelId ? (unreadByChannelId[activeChannelId] ?? 0) : 0;
  const showUnreadBanner = totalUnread > 0 && !unreadDismissed[activeChannelId ?? ''];

  const handleReact = (messageId: string, emoji: string) => {
    setReactions(prev => {
      const current = prev[messageId] ?? [];
      const existing = current.find(r => r.emoji === emoji);
      const userId = auth.user.id;
      if (existing) {
        const hasVoted = existing.userIds.includes(userId);
        const updated = hasVoted
          ? { ...existing, count: existing.count - 1, userIds: existing.userIds.filter(id => id !== userId) }
          : { ...existing, count: existing.count + 1, userIds: [...existing.userIds, userId] };
        return { ...prev, [messageId]: current.map(r => r.emoji === emoji ? updated : r).filter(r => r.count > 0) };
      }
      return { ...prev, [messageId]: [...current, { emoji, count: 1, userIds: [userId] }] };
    });
  };

  const handleAvatarClick = (e: React.MouseEvent, user: { id: string; displayName: string; username?: string }) => {
    if (user.id === auth.user.id) return;
    e.stopPropagation();
    setProfilePopup({ user, position: { x: e.clientX + 12, y: e.clientY - 40 } });
  };

  const handleOpenDMFromPopup = (userId: string) => {
    const user = knownUsers.find(u => u.id === userId);
    if (user?.username) {
      props.setDirectUsername(user.username);
      props.onStartDirectByUsername();
    }
  };

  return (
    <main className="chat-app-shell">
      <section className="chat-shell">
        {/* Topbar */}
        <header className="chat-topbar">
          <div className="brand-block">
            <img src="/chat-net-logo.svg" alt="" className="brand-logo" />
            <h1>Chat-Net</h1>
          </div>
          <div className="user-block">
            <span className={`realtime-pill ${realtimeState}`} aria-live="polite">
              {realtimeState === 'online' ? '● Live' : realtimeState === 'connecting' ? 'Verbinde…' : '○ Offline'}
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
              <button className="icon-btn" title="Suchen (⌘K)" onClick={() => setSearchModalOpen(true)}>🔍</button>
              <button className={`icon-btn${theme === 'dark' ? '' : ' active-btn'}`} onClick={onToggleTheme}>{theme === 'dark' ? '☀' : '☾'}</button>
              {currentUserIsPlatformOwner && (
                <button className="icon-btn" onClick={() => { setSettingsTab('owner'); setSettingsOpen(true); }}>⚙</button>
              )}
              <button className="icon-btn" onClick={() => { setSettingsTab('profile'); setSettingsOpen(true); }}>◎</button>
              <button className="icon-btn danger-btn" onClick={onLogout}>⏻</button>
            </div>
          </div>
        </header>

        <div className={isMobileLayout ? (mobilePane === 'chat' ? 'chat-layout mobile-chat-open' : 'chat-layout mobile-list-open') : 'chat-layout'}>

          {/* Sidebar */}
          <aside className="panel channel-panel">
            <div className="sidebar-section-header">
              <span className="sidebar-section-label">Chats</span>
              <span className="sidebar-count">{channels.length}</span>
            </div>
            <div className="channel-toolbar">
              <button className="sidebar-action-btn" onClick={onOpenCreateChannelModal}>+ Gruppe</button>
              <button className="sidebar-action-btn" onClick={onOpenDirectModal}>✉ DM</button>
              {activeChannel?.type === 'GROUP' && !activeChannel?.isSystem && (
                <button className="sidebar-action-btn" onClick={onOpenAddMemberModal} disabled={ownMembershipRole !== 'OWNER'}>👤</button>
              )}
            </div>
            <div className="channel-items">
              {sortedChannels.map(ch => {
                const unread = unreadByChannelId[ch.id] ?? 0;
                const name = getChannelDisplayName(ch);
                return (
                  <button
                    key={ch.id}
                    className={`channel-item${ch.id === activeChannelId ? ' active' : unread > 0 ? ' unread' : ''}`}
                    onClick={() => openChannel(ch.id)}
                  >
                    <div className="ch-avatar" style={{ background: ch.isSystem ? '#222' : avatarColor(ch.id) }}>
                      {ch.isSystem ? '📣' : getInitials(name)}
                    </div>
                    <div className="channel-main">
                      <span className={`channel-name${unread > 0 && ch.id !== activeChannelId ? ' unread-name' : ''}`}>{name}</span>
                      <small className="channel-subline">{ch.isSystem ? 'Ankündigungen' : ch.type === 'DIRECT' ? 'Direktnachricht' : 'Gruppe'}</small>
                    </div>
                    {unread > 0 && <span className="channel-unread">{unread > 99 ? '99+' : unread}</span>}
                  </button>
                );
              })}
              {!channels.length && <p className="empty-hint">Noch keine Chats.</p>}
            </div>
          </aside>

          {/* Message panel */}
          <section className="panel message-panel">
            {/* Room header */}
            <div className="chat-room-header">
              {isMobileLayout && (
                <button className="icon-btn" onClick={() => setMobilePane('list')}>←</button>
              )}
              <div className="chat-room-meta">
                {activeChannel && (
                  <div className="room-avatar" style={{ background: activeChannel.isSystem ? '#222' : avatarColor(activeChannel.id) }}>
                    {activeChannel.isSystem ? '📣' : getInitials(getChannelDisplayName(activeChannel))}
                  </div>
                )}
                <div className="room-info">
                  <h3>
                    {getChannelDisplayName(activeChannel)}
                    {activeChannel?.isSystem && <span className="system-channel-badge">Offiziel</span>}
                  </h3>
                  <span>{activeChannel?.isSystem ? 'Nur das Team kann schreiben' : activeConversationStatus}{voiceCallState !== 'idle' ? ` · 🔊 ${voiceParticipants} aktiv` : ''}</span>
                </div>
              </div>
              <div className="room-actions">
                {voiceSupported && activeChannelId && (
                  voiceCallState === 'idle'
                    ? <button className="icon-btn" onClick={onStartVoiceCall} title="Sprachanruf">🎙</button>
                    : <>
                        <button className={isVoiceMuted ? 'icon-btn danger-btn' : 'icon-btn active-btn'} onClick={onToggleVoiceMute}>{isVoiceMuted ? '🔇' : '🎙'}</button>
                        <button className="icon-btn danger-btn" onClick={onLeaveVoiceCall}>📵</button>
                      </>
                )}
                <button className={`icon-btn${showInlineSearch ? ' active-btn' : ''}`} onClick={() => setShowInlineSearch(v => !v)}>🔍</button>
                {activeChannel && <span className="chat-room-type-pill">{activeChannel.isSystem ? 'System' : activeChannel.type === 'GROUP' ? 'Gruppe' : 'Direkt'}</span>}
              </div>
            </div>

            {/* Pinned message */}
            {activeChannel?.pinnedMessageContent && (
              <div className="pinned-banner">
                <span className="pinned-banner-icon">📌</span>
                <span className="pinned-banner-text"><strong>Angepinnt:</strong> {activeChannel.pinnedMessageContent}</span>
              </div>
            )}

            {/* Inline search */}
            {showInlineSearch && (
              <div className="search-row">
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Suchen…" autoFocus />
                <button className="secondary compact" onClick={onSearch}>Suchen</button>
                <button className="secondary compact" onClick={onSummarizeChannel} disabled={!activeChannelId || summaryLoading}>{summaryLoading ? 'Lädt…' : 'AI-Zusammenfassung'}</button>
                <button className="secondary compact" onClick={onCreatePoll} disabled={!activeChannelId || pollLoading}>{pollLoading ? 'Lädt…' : 'Umfrage'}</button>
              </div>
            )}

            {searchResults.length > 0 && showInlineSearch && (
              <div className="search-results">
                {searchResults.slice(0, 5).map(r => (
                  <p key={r.id} className="result-item"><strong>{r.sender.displayName}:</strong> {r.content}</p>
                ))}
              </div>
            )}

            {polls.length > 0 && (
              <div className="poll-strip">
                {polls.slice(0, 3).map(poll => (
                  <article key={poll.id} className="poll-card">
                    <p className="poll-question">{poll.question}</p>
                    <div className="poll-options">
                      {poll.options.map(opt => (
                        <button key={opt.id} className={`poll-option${poll.votedOptionId === opt.id ? ' active' : ''}`} onClick={() => onVotePoll(poll.id, opt.id)} disabled={poll.isClosed}>
                          <span className="poll-label">{opt.label}</span>
                          <strong className="poll-count">{opt.voteCount}</strong>
                        </button>
                      ))}
                    </div>
                    <small className="poll-total">{poll.totalVotes} Stimmen{poll.isClosed ? ' · Geschlossen' : ''}</small>
                  </article>
                ))}
              </div>
            )}

            {/* Message list */}
            <div className="message-list" ref={messageListRef}>
              {showUnreadBanner && (
                <div className="unread-banner" onClick={() => setUnreadDismissed(p => ({ ...p, [activeChannelId ?? '']: true }))}>
                  <span>↓ {totalUnread} neue Nachricht{totalUnread !== 1 ? 'en' : ''}</span>
                  <button className="unread-banner-close" onClick={e => { e.stopPropagation(); setUnreadDismissed(p => ({ ...p, [activeChannelId ?? '']: true })); }}>×</button>
                </div>
              )}

              {enriched.map(entry => {
                const isOwn = entry.sender.id === auth.user.id;
                const isActive = activeMessageId === entry.id;
                const isOnline = Boolean(presenceMap[entry.sender.id]);
                const role = memberRoleByUserId.get(entry.sender.id);
                const color = avatarColor(entry.sender.id);
                const voiceUrl = entry.content.match(/^\[voice\]\s+(https?:\/\/\S+)$/i)?.[1] ?? null;
                const msgReactions = reactions[entry.id] ?? entry.reactions ?? [];
                const status = (entry as MessageItem & { status?: string }).status;

                return (
                  <article
                    key={entry.id}
                    className={['msg-row', entry.isGroupStart ? 'group-start' : 'group-cont', isActive ? 'selected' : '', status === 'sending' ? 'sending' : '', status === 'failed' ? 'failed' : ''].filter(Boolean).join(' ')}
                    onClick={() => setActiveMessageId(c => c === entry.id ? null : entry.id)}
                  >
                    {/* Reaction quick-picker (shows on hover) */}
                    <div className="reaction-picker">
                      {QUICK_EMOJIS.map(emoji => (
                        <button key={emoji} onClick={e => { e.stopPropagation(); handleReact(entry.id, emoji); }}>{emoji}</button>
                      ))}
                    </div>

                    <div className="msg-avatar-col">
                      {entry.isGroupStart && !isOwn && (
                        <div
                          className="msg-avatar"
                          style={{ background: color }}
                          onClick={e => handleAvatarClick(e, entry.sender)}
                        >
                          {getInitials(entry.sender.displayName)}
                          {isOnline && <span className="msg-presence-dot" />}
                        </div>
                      )}
                    </div>

                    <div className="msg-body">
                      {entry.isGroupStart && !isOwn && (
                        <div className="msg-header">
                          <span className="msg-author" style={{ color }} onClick={e => handleAvatarClick(e, entry.sender)}>
                            {entry.sender.displayName}
                          </span>
                          {renderPlatformOwnerBadge(entry.sender.id, entry.sender.username)}
                          {renderCustomBadges(entry.sender.id)}
                          {role && role !== 'MEMBER' && <span className="role-pill">{role}</span>}
                          <span className="msg-time">{formatTimeLabel(entry.createdAt)}</span>
                        </div>
                      )}
                      {entry.isGroupStart && isOwn && (
                        <div className="msg-header">
                          <span className="msg-time">{formatTimeLabel(entry.createdAt)}</span>
                        </div>
                      )}

                      {editingMessageId === entry.id ? (
                        <div className="edit-row">
                          <input value={editingContent} onChange={e => setEditingContent(e.target.value)} autoFocus />
                          <button className="primary compact" onClick={() => onSaveEdit(entry.id)}>✓</button>
                          <button className="secondary compact" onClick={() => onEditMessage(entry)}>×</button>
                        </div>
                      ) : voiceUrl ? (
                        <audio controls preload="none" src={voiceUrl} className="voice-message-player" />
                      ) : (
                        <>
                          {entry.replyTo && (
                            <div className="reply-preview">
                              <strong>{entry.replyTo.sender.displayName}</strong>
                              <span>{entry.replyTo.content}</span>
                            </div>
                          )}
                          <p className="message-content">{renderContentWithMentions(entry.content)}</p>
                          {entry.content.startsWith('http') && !voiceUrl && (
                            <a className="file-link" href={entry.content} target="_blank" rel="noreferrer">Datei öffnen ↗</a>
                          )}
                        </>
                      )}

                      {status === 'sending' && <span className="msg-status">Sendet…</span>}
                      {status === 'failed' && (
                        <span className="msg-status failed">
                          Fehlgeschlagen
                          <button className="msg-retry" onClick={e => { e.stopPropagation(); onSendMessage(); }}>Erneut</button>
                        </span>
                      )}

                      {/* Reactions */}
                      {msgReactions.length > 0 && (
                        <div className="msg-reactions">
                          {msgReactions.map(r => (
                            <button
                              key={r.emoji}
                              className={`reaction-chip${r.userIds.includes(auth.user.id) ? ' mine' : ''}`}
                              onClick={e => { e.stopPropagation(); handleReact(entry.id, r.emoji); }}
                            >
                              {r.emoji} <span className="reaction-count">{r.count}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Message actions */}
                      <div className={isActive ? 'msg-actions visible' : 'msg-actions'}>
                        <button className="msg-action-btn" onClick={e => { e.stopPropagation(); onReplyToMessage(entry.id); }} title="Antworten">↩</button>
                        {isOwn && <button className="msg-action-btn" onClick={e => { e.stopPropagation(); onEditMessage(entry); }} title="Bearbeiten">✎</button>}
                        {(isOwn || canModerateMembers) && <button className="msg-action-btn danger" onClick={e => { e.stopPropagation(); onDeleteMessage(entry.id); }} title="Löschen">🗑</button>}
                        {!isOwn && <button className="msg-action-btn danger" onClick={e => { e.stopPropagation(); onBlockSender(entry.sender.id); }} title="Blockieren">🚫</button>}
                      </div>
                    </div>
                  </article>
                );
              })}

              {!messages.length && (
                <div className="empty-state">
                  <div className="empty-state-icon">💬</div>
                  <p>{activeChannel ? `Willkommen${activeChannel.type === 'GROUP' ? ' in ' + getChannelDisplayName(activeChannel) : ', ' + getChannelDisplayName(activeChannel)}!` : 'Chat auswählen'}</p>
                  <span>{activeChannel ? 'Noch keine Nachrichten. Schreib die erste!' : 'Wähle links einen Chat.'}</span>
                </div>
              )}
            </div>

            {/* Composer */}
            {activeChannel?.isSystem && !currentUserIsPlatformOwner ? (
              <div className="system-composer-lock">
                <span>🔒</span>
                <span>Nur das Team kann in diesem Kanal schreiben.</span>
              </div>
            ) : (
              <div className="composer">
                <div className="composer-side-actions">
                  <label className={uploadsEnabledForAll ? 'composer-icon-btn' : 'composer-icon-btn disabled'} htmlFor="upload-input">📎</label>
                  <input id="upload-input" className="file-input" type="file" onChange={onUploadSelected} disabled={!uploadsEnabledForAll} />
                  {voiceNoteSupported && (
                    <button
                      className={`composer-icon-btn${voiceNoteState === 'uploading' ? ' disabled' : voiceNoteState === 'recording' ? ' recording' : ''}`}
                      onClick={voiceNoteState === 'recording' ? onStopVoiceNote : onStartVoiceNote}
                      disabled={voiceNoteState === 'uploading'}
                    >
                      {voiceNoteState === 'recording' ? '⏹' : '🎙'}
                    </button>
                  )}
                </div>
                <div className="composer-input-wrap">
                  {replyingToMessageId && (
                    <div className="reply-banner">
                      <span>↩ Antwort auf Nachricht</span>
                      <button className="secondary compact" onClick={onCancelReply}>×</button>
                    </div>
                  )}
                  <textarea
                    ref={composerRef}
                    value={composerText}
                    onChange={onComposerChange}
                    onKeyDown={onComposerKeyDown}
                    placeholder={activeChannel ? `Nachricht an ${getChannelDisplayName(activeChannel)}…` : 'Nachricht schreiben…'}
                  />
                  {mentionQuery !== null && filteredMentionCandidates.length > 0 && (
                    <div className="mention-suggestions">
                      {filteredMentionCandidates.map((item, i) => (
                        <button key={item.username} className={`mention-option${i === mentionIndex ? ' active' : ''}`} onClick={() => insertMention(item.username)}>
                          <div className="mention-avatar" style={{ background: avatarColor(item.username) }}>{getInitials(item.displayName)}</div>
                          <div><span>@{item.username}</span><small>{item.displayName}</small></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button className="composer-send" onClick={onSendMessage}>➤</button>
              </div>
            )}
          </section>
        </div>

        {message && <p className="message-banner">{message}</p>}
        {mentionNotice && <p className="message-banner mention-banner">{mentionNotice}</p>}

        {/* Search modal */}
        <SearchModal
          open={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          channels={channels}
          results={searchResults}
          query={searchQuery}
          onQueryChange={setSearchQuery}
          onSearch={onSearch}
          onJump={(channelId) => { openChannel(channelId); setSearchModalOpen(false); }}
          getChannelDisplayName={getChannelDisplayName}
          formatTimeLabel={formatTimeLabel}
        />

        {/* Profile popup */}
        <ProfilePopup
          user={profilePopup?.user ?? null}
          isOnline={profilePopup ? Boolean(presenceMap[profilePopup.user.id]) : false}
          position={profilePopup?.position ?? null}
          onClose={() => setProfilePopup(null)}
          onOpenDM={handleOpenDMFromPopup}
          avatarColor={avatarColor}
          getInitials={getInitials}
        />

        {/* Settings modal */}
        {settingsOpen && (
          <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
            <section className="modal-panel settings-panel" role="dialog" onClick={e => e.stopPropagation()}>
              <div className="settings-head">
                <h3>Einstellungen</h3>
                <button className="secondary compact" onClick={() => setSettingsOpen(false)}>Schließen</button>
              </div>
              <div className="settings-tabs">
                <button className={`settings-tab${settingsTab === 'profile' ? ' active' : ''}`} onClick={() => setSettingsTab('profile')}>Profil</button>
                {currentUserIsPlatformOwner && <button className={`settings-tab${settingsTab === 'owner' ? ' active' : ''}`} onClick={() => setSettingsTab('owner')}>Owner</button>}
              </div>
              {settingsTab === 'profile' && (
                <div className="profile-grid">
                  <label>Nickname<input value={profileNickname} onChange={e => setProfileNickname(e.target.value)} placeholder="Dein Nickname" /></label>
                  <label>Username<input value={profileUsername} onChange={e => setProfileUsername(e.target.value.toLowerCase())} placeholder="discord_style" /></label>
                  <p className="inline-note">ID: <strong>{auth.user.userHandle}</strong></p>
                  <button className="primary compact" onClick={onSaveProfile}>Speichern</button>
                </div>
              )}
              {settingsTab === 'owner' && currentUserIsPlatformOwner && (
                <div className="owner-studio">
                  <div className="panel-header owner-studio-header">
                    <h3>Badge Studio</h3>
                  </div>
                  <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    Zielperson
                    <select className="owner-studio-select" value={badgeTargetUserId} onChange={e => setBadgeTargetUserId(e.target.value)}>
                      {knownUsers.map(u => <option key={u.id} value={u.id}>{u.displayName}{u.username ? ` (@${u.username})` : ''}</option>)}
                    </select>
                  </label>
                  {badgeTargetUser && (
                    <div className="owner-studio-badges">
                      {badgeDefinitions.map(b => {
                        const active = (customBadgesByUserId[badgeTargetUser.id] ?? []).includes(b.id);
                        return (
                          <label key={b.id} className={`badge-toggle${active ? ' active' : ''}`}>
                            <input type="checkbox" checked={active} onChange={() => toggleBadgeForUser(badgeTargetUser.id, b.id)} />
                            {b.label}
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <div className="owner-studio-create">
                    <p className="inline-note">Eigenes Badge erstellen</p>
                    <div className="owner-studio-create-grid">
                      <input value={newBadgeLabel} onChange={e => setNewBadgeLabel(e.target.value)} placeholder="Name" />
                      <input value={newBadgeShortLabel} onChange={e => setNewBadgeShortLabel(e.target.value)} placeholder="Kurzlabel" maxLength={10} />
                      <button className="secondary compact" onClick={createCustomBadge}>Erstellen</button>
                    </div>
                  </div>
                  {canManagePlatformSettings && (
                    <div className="owner-studio-toggle-row">
                      <button className={uploadsEnabled ? 'primary compact' : 'secondary compact'} disabled={platformToggleLoading} onClick={() => onToggleGlobalUploads(true)}>Uploads AN</button>
                      <button className={!uploadsEnabled ? 'primary compact' : 'secondary compact'} disabled={platformToggleLoading} onClick={() => onToggleGlobalUploads(false)}>Uploads AUS</button>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Create channel modal */}
        {createChannelModalOpen && (
          <div className="modal-backdrop" onClick={() => setCreateChannelModalOpen(false)}>
            <section className="modal-panel" role="dialog" onClick={e => e.stopPropagation()}>
              <h3>Neue Gruppe</h3>
              <input value={newChannelName} onChange={e => setNewChannelName(e.target.value)} placeholder="Gruppenname" />
              <div className="modal-actions">
                <button className="secondary compact" onClick={() => setCreateChannelModalOpen(false)}>Abbrechen</button>
                <button className="primary compact" onClick={onCreateChannelFromModal}>Erstellen</button>
              </div>
            </section>
          </div>
        )}

        {/* DM modal */}
        {directModalOpen && (
          <div className="modal-backdrop" onClick={() => setDirectModalOpen(false)}>
            <section className="modal-panel" role="dialog" onClick={e => e.stopPropagation()}>
              <h3>Direktnachricht</h3>
              <input value={directUsername} onChange={e => setDirectUsername(e.target.value.toLowerCase())} placeholder="@username" />
              <div className="modal-actions">
                <button className="secondary compact" onClick={() => setDirectModalOpen(false)}>Abbrechen</button>
                <button className="primary compact" onClick={onStartDirectByUsername}>Starten</button>
              </div>
            </section>
          </div>
        )}

        {/* Add member modal */}
        {addMemberModalOpen && (
          <div className="modal-backdrop" onClick={() => setAddMemberModalOpen(false)}>
            <section className="modal-panel" role="dialog" onClick={e => e.stopPropagation()}>
              <h3>Person hinzufügen</h3>
              <input value={addMemberUsername} onChange={e => setAddMemberUsername(e.target.value.toLowerCase())} placeholder="@username" />
              <div className="modal-actions">
                <button className="secondary compact" onClick={() => setAddMemberModalOpen(false)}>Abbrechen</button>
                <button className="primary compact" onClick={onAddMemberByUsername}>Hinzufügen</button>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
