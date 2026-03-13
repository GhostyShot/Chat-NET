import type { ChannelItem } from "@chatnet/shared";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

interface Props {
  sortedChannels: ChannelItem[];
  openChannel: (id: string) => void;
  getChannelDisplayName: (channel: ChannelItem | null) => string;
  getChannelTypeLabel: (channel: ChannelItem) => string;
  onOpenCreateChannelModal: () => void;
  onOpenDirectModal: () => void;
  realtimeState: "connecting" | "online" | "offline";
  onLogout: () => void;
  onOpenSettings: () => void;
}

export function ChannelSidebar({
  sortedChannels,
  openChannel,
  getChannelDisplayName,
  getChannelTypeLabel,
  onOpenCreateChannelModal,
  onOpenDirectModal,
  realtimeState,
  onLogout,
  onOpenSettings,
}: Props) {
  const auth = useAuthStore((s) => s.auth);
  const { activeChannelId, unreadByChannelId } = useChatStore();

  const realtimeLabel: Record<string, string> = {
    online: "Online",
    connecting: "Verbindet…",
    offline: "Offline",
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <img src="/chat-net-logo.svg" alt="Chat-Net" className="sidebar-logo" />
        <span className="sidebar-title">Chat-Net</span>
        <span className={`realtime-dot ${realtimeState}`} title={realtimeLabel[realtimeState]} />
      </div>

      {/* Channel list */}
      <div className="sidebar-section-label">Gruppen & Chats</div>
      <div className="channel-list">
        {sortedChannels.map((channel) => {
          const unread = unreadByChannelId[channel.id] ?? 0;
          const isActive = channel.id === activeChannelId;
          return (
            <button
              key={channel.id}
              className={`channel-item${isActive ? " active" : ""}${unread > 0 ? " unread" : ""}`}
              onClick={() => openChannel(channel.id)}
            >
              <span className="channel-type-icon">
                {channel.type === "GROUP" ? "#" : "@"}
              </span>
              <span className="channel-name">{getChannelDisplayName(channel)}</span>
              {unread > 0 && (
                <span className="unread-badge">{unread > 99 ? "99+" : unread}</span>
              )}
              <span className="channel-type-label">{getChannelTypeLabel(channel)}</span>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="sidebar-actions">
        <button className="sidebar-btn" onClick={onOpenCreateChannelModal}>+ Gruppe</button>
        <button className="sidebar-btn" onClick={onOpenDirectModal}>+ Direktchat</button>
      </div>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          {auth?.user.avatarUrl ? (
            <img src={auth.user.avatarUrl} alt={auth.user.displayName} className="footer-avatar" />
          ) : (
            <div className="footer-avatar-fallback">
              {auth?.user.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="footer-user-info">
            <span className="footer-displayname">{auth?.user.displayName}</span>
            <span className="footer-username">@{auth?.user.username}</span>
          </div>
        </div>
        <div className="footer-btns">
          <button className="icon-btn" onClick={onOpenSettings} title="Einstellungen">⚙</button>
          <button className="icon-btn" onClick={onLogout} title="Abmelden">⏏</button>
        </div>
      </div>
    </aside>
  );
}
