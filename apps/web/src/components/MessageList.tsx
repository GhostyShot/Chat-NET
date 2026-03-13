import { useEffect, useRef, type RefObject } from "react";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import { MessageBubble } from "./MessageBubble";
import { useMessagePagination } from "../hooks/useMessagePagination";
import type { MessageItem } from "@chatnet/shared";

interface Props {
  messageListRef: RefObject<HTMLDivElement>;
  memberRoleByUserId: Map<string, "OWNER" | "ADMIN" | "MEMBER">;
  canModerate: boolean;
  formatTimeLabel: (value?: string) => string;
  renderContentWithMentions: (content: string) => React.ReactNode;
  renderOwnerBadge: (userId?: string, username?: string) => React.ReactNode;
  renderCustomBadges: (userId?: string) => React.ReactNode;
  onReply: (id: string) => void;
  onEdit: (id: string, content: string) => void;
  onSaveEdit: () => void;
  onDelete: (id: string) => void;
  onBlock: (senderId: string) => void;
}

export function MessageList({
  messageListRef,
  memberRoleByUserId,
  canModerate,
  formatTimeLabel,
  renderContentWithMentions,
  renderOwnerBadge,
  renderCustomBadges,
  onReply,
  onEdit,
  onSaveEdit,
  onDelete,
  onBlock,
}: Props) {
  const auth = useAuthStore((s) => s.auth);
  const {
    messages,
    presenceMap,
    activeMessageId,
    editingMessageId,
    editingContent,
    setActiveMessageId,
    setEditingContent,
    setReplyingToMessageId,
  } = useChatStore();

  const { hasMore, loading, loadOlder, resetPagination } = useMessagePagination();
  const prevChannelId = useRef<string | null>(null);
  const activeChannelId = useChatStore((s) => s.activeChannelId);

  // Reset pagination + scroll on channel switch
  useEffect(() => {
    if (prevChannelId.current !== activeChannelId) {
      resetPagination();
      prevChannelId.current = activeChannelId;
      const el = messageListRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [activeChannelId, resetPagination, messageListRef]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages, messageListRef]);

  // Infinite scroll (scroll to top triggers load)
  const onScroll = () => {
    const el = messageListRef.current;
    if (!el || !hasMore || loading) return;
    if (el.scrollTop < 120) void loadOlder();
  };

  if (messages.length === 0) {
    return (
      <div ref={messageListRef} className="message-list message-list-empty">
        <div className="empty-state">
          <span className="empty-icon">💬</span>
          <p>Noch keine Nachrichten. Starte die Unterhaltung!</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={messageListRef} className="message-list" onScroll={onScroll}>
      {/* Load more indicator */}
      {hasMore && (
        <div className="load-more">
          {loading ? (
            <span className="load-more-spinner">⏳ Lädt…</span>
          ) : (
            <button className="btn-ghost btn-sm" onClick={() => void loadOlder()}>
              ↑ Ältere Nachrichten laden
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      {messages.map((msg: MessageItem) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwnMessage={msg.sender.id === auth?.user.id}
          isEditing={editingMessageId === msg.id}
          editingContent={editingContent}
          activeMessageId={activeMessageId}
          presenceMap={presenceMap}
          memberRoleByUserId={memberRoleByUserId}
          canModerate={canModerate}
          formatTimeLabel={formatTimeLabel}
          renderContentWithMentions={renderContentWithMentions}
          renderOwnerBadge={renderOwnerBadge}
          renderCustomBadges={renderCustomBadges}
          onReply={onReply}
          onEdit={onEdit}
          onSaveEdit={onSaveEdit}
          onCancelEdit={() => {
            useChatStore.getState().setEditingMessageId(null);
            useChatStore.getState().setEditingContent("");
          }}
          onDelete={onDelete}
          onBlock={onBlock}
          onSetActive={setActiveMessageId}
          setEditingContent={setEditingContent}
        />
      ))}
    </div>
  );
}
