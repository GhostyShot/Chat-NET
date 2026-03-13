import { useCallback, useRef, useState } from "react";
import { listMessages } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

/**
 * Cursor-based infinite scroll for messages.
 * Call `loadOlder()` when the user scrolls to the top.
 */
export function useMessagePagination() {
  const auth = useAuthStore((s) => s.auth);
  const { activeChannelId, setMessages, setMessage } = useChatStore();

  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const cursorRef = useRef<string | undefined>(undefined);

  // Reset when channel changes
  const resetPagination = useCallback(() => {
    cursorRef.current = undefined;
    setHasMore(true);
  }, []);

  const loadOlder = useCallback(async () => {
    if (!auth || !activeChannelId || loading || !hasMore) return;
    setLoading(true);
    try {
      const result = await listMessages(auth.tokens.accessToken, activeChannelId, {
        limit: 50,
        cursor: cursorRef.current,
      });

      if (result.items.length === 0 || !result.nextCursor) {
        setHasMore(false);
      }

      if (result.nextCursor) {
        cursorRef.current = result.nextCursor;
      }

      // Prepend older messages (API returns newest-first, we reverse for display)
      const older = result.items.slice().reverse();
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nachrichten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, [auth, activeChannelId, loading, hasMore, setMessages, setMessage]);

  return { hasMore, loading, loadOlder, resetPagination };
}
