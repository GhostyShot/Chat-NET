import type { MessageItem } from "@chatnet/shared";

interface Props {
  message: MessageItem;
  isOwnMessage: boolean;
  isEditing: boolean;
  editingContent: string;
  activeMessageId: string | null;
  presenceMap: Record<string, boolean>;
  memberRoleByUserId: Map<string, "OWNER" | "ADMIN" | "MEMBER">;
  canModerate: boolean;
  formatTimeLabel: (value?: string) => string;
  renderContentWithMentions: (content: string) => React.ReactNode;
  renderOwnerBadge: (userId?: string, username?: string) => React.ReactNode;
  renderCustomBadges: (userId?: string) => React.ReactNode;
  onReply: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onBlock: (senderId: string) => void;
  onSetActive: (id: string | null) => void;
  setEditingContent: (content: string) => void;
}

export function MessageBubble({
  message,
  isOwnMessage,
  isEditing,
  editingContent,
  activeMessageId,
  presenceMap,
  memberRoleByUserId,
  canModerate,
  formatTimeLabel,
  renderContentWithMentions,
  renderOwnerBadge,
  renderCustomBadges,
  onReply,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onBlock,
  onSetActive,
  setEditingContent,
}: Props) {
  const isActive = activeMessageId === message.id;
  const role = memberRoleByUserId.get(message.sender.id);
  const isOnline = presenceMap[message.sender.id] ?? false;

  const isVoiceNote = message.content.startsWith("[voice] ");
  const voiceUrl = isVoiceNote ? message.content.slice(8) : null;

  const isImage =
    !isVoiceNote &&
    /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(message.content);
  const isFile =
    !isVoiceNote &&
    !isImage &&
    message.content.startsWith("http") &&
    !message.content.startsWith("[voice]");

  return (
    <div
      className={`message-row${ isOwnMessage ? " own" : ""}${isActive ? " active" : ""}`}
      onClick={() => onSetActive(isActive ? null : message.id)}
    >
      {/* Avatar */}
      <div className="msg-avatar">
        {message.sender.avatarUrl ? (
          <img src={message.sender.avatarUrl} alt={message.sender.displayName} />
        ) : (
          <div className="avatar-fallback">
            {message.sender.displayName.slice(0, 1).toUpperCase()}
          </div>
        )}
        {isOnline && <span className="presence-dot online" />}
      </div>

      {/* Content */}
      <div className="msg-body">
        {/* Header */}
        <div className="msg-header">
          <span className="msg-author">{message.sender.displayName}</span>
          {renderOwnerBadge(message.sender.id, message.sender.username)}
          {renderCustomBadges(message.sender.id)}
          {role && role !== "MEMBER" && (
            <span className={`role-chip role-${role.toLowerCase()}`}>{role}</span>
          )}
          <span className="msg-time">{formatTimeLabel(message.createdAt)}</span>
          {message.updatedAt !== message.createdAt && (
            <span className="msg-edited">(bearbeitet)</span>
          )}
        </div>

        {/* Reply preview */}
        {message.replyTo && (
          <div className="reply-preview">
            <span className="reply-author">{message.replyTo.sender.displayName}</span>
            <span className="reply-text">{message.replyTo.content.slice(0, 100)}</span>
          </div>
        )}

        {/* Message content */}
        {isEditing ? (
          <div className="edit-row">
            <textarea
              className="edit-input"
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSaveEdit(); }
                if (e.key === "Escape") onCancelEdit();
              }}
              autoFocus
            />
            <div className="edit-actions">
              <button className="btn-ghost btn-sm" onClick={onCancelEdit}>Abbrechen</button>
              <button className="btn-primary btn-sm" onClick={onSaveEdit}>Speichern</button>
            </div>
          </div>
        ) : voiceUrl ? (
          <audio className="voice-note" controls src={voiceUrl} />
        ) : isImage ? (
          <a href={message.content} target="_blank" rel="noopener noreferrer">
            <img className="msg-image" src={message.content} alt="Bild" loading="lazy" />
          </a>
        ) : isFile ? (
          <a className="msg-file-link" href={message.content} target="_blank" rel="noopener noreferrer">
            📎 Datei herunterladen
          </a>
        ) : (
          <div className="msg-text">{renderContentWithMentions(message.content)}</div>
        )}

        {/* Actions (show when active) */}
        {isActive && !isEditing && (
          <div className="msg-actions">
            <button className="msg-action-btn" onClick={() => onReply(message.id)} title="Antworten">↩</button>
            {isOwnMessage && (
              <button className="msg-action-btn" onClick={() => onEdit(message.id, message.content)} title="Bearbeiten">✏️</button>
            )}
            {(isOwnMessage || canModerate) && (
              <button className="msg-action-btn danger" onClick={() => onDelete(message.id)} title="Löschen">🗑</button>
            )}
            {!isOwnMessage && (
              <button className="msg-action-btn" onClick={() => onBlock(message.sender.id)} title="Blockieren">🚫</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
