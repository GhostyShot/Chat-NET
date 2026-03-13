import { type ChangeEvent, type KeyboardEvent, type RefObject } from "react";
import { REALTIME_EVENTS } from "@chatnet/shared";
import type { Socket } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";

interface MentionCandidate {
  username: string;
  displayName: string;
}

interface Props {
  composerRef: RefObject<HTMLTextAreaElement>;
  socketRef: RefObject<Socket | null>;
  filteredMentionCandidates: MentionCandidate[];
  mentionQuery: string | null;
  mentionIndex: number;
  setMentionQuery: (q: string | null) => void;
  setMentionIndex: (i: number) => void;
  insertMention: (username: string) => void;
  onSendMessage: () => Promise<void>;
  onUploadSelected: (files: FileList) => Promise<void>;
  onStartVoiceNote: () => Promise<void>;
  onStopVoiceNote: () => void;
  voiceNoteState: "idle" | "recording" | "uploading";
  voiceNoteSupported: boolean;
  uploadsEnabledForAll: boolean;
  onCreatePoll: () => void;
  onSummarizeChannel: () => Promise<void>;
  summaryLoading: boolean;
}

export function ComposerBar({
  composerRef,
  socketRef,
  filteredMentionCandidates,
  mentionQuery,
  mentionIndex,
  setMentionQuery,
  setMentionIndex,
  insertMention,
  onSendMessage,
  onUploadSelected,
  onStartVoiceNote,
  onStopVoiceNote,
  voiceNoteState,
  voiceNoteSupported,
  uploadsEnabledForAll,
  onCreatePoll,
  onSummarizeChannel,
  summaryLoading,
}: Props) {
  const auth = useAuthStore((s) => s.auth);
  const { composerText, activeChannelId, replyingToMessageId, messages, setComposerText, setReplyingToMessageId } = useChatStore();

  const replyTarget = replyingToMessageId
    ? messages.find((m) => m.id === replyingToMessageId)
    : null;

  const updateMentionState = (value: string, caret: number) => {
    const before = value.slice(0, caret);
    const match = before.match(/(?:^|\s)@([a-z0-9_]*)$/iu);
    if (!match) {
      setMentionQuery(null);
      setMentionIndex(0);
      return;
    }
    setMentionQuery((match[1] ?? "").toLowerCase());
    setMentionIndex(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMentionCandidates.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((mentionIndex + 1) % filteredMentionCandidates.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((mentionIndex - 1 + filteredMentionCandidates.length) % filteredMentionCandidates.length); return; }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); insertMention(filteredMentionCandidates[mentionIndex]?.username ?? filteredMentionCandidates[0].username); return; }
      if (e.key === "Escape") { setMentionQuery(null); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void onSendMessage(); }
  };

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setComposerText(next);
    updateMentionState(next, e.target.selectionStart ?? next.length);
    if (auth && activeChannelId && next.trim() && socketRef.current) {
      socketRef.current.emit(REALTIME_EVENTS.TYPING, { roomId: activeChannelId, userId: auth.user.id });
    }
  };

  return (
    <div className="composer-wrapper">
      {/* Reply Banner */}
      {replyTarget && (
        <div className="reply-banner">
          <span>Antwort an <strong>{replyTarget.sender.displayName}</strong>: {replyTarget.content.slice(0, 60)}{replyTarget.content.length > 60 ? "…" : ""}</span>
          <button className="reply-cancel" onClick={() => setReplyingToMessageId(null)}>✕</button>
        </div>
      )}

      {/* Mention suggestions */}
      {mentionQuery !== null && filteredMentionCandidates.length > 0 && (
        <div className="mention-dropdown">
          {filteredMentionCandidates.map((c, i) => (
            <button
              key={c.username}
              className={`mention-option${i === mentionIndex ? " active" : ""}`}
              onMouseDown={(e) => { e.preventDefault(); insertMention(c.username); }}
            >
              <span className="mention-username">@{c.username}</span>
              <span className="mention-displayname">{c.displayName}</span>
            </button>
          ))}
        </div>
      )}

      {/* Composer row */}
      <div className="composer-row">
        {/* Left actions */}
        <div className="composer-actions-left">
          {uploadsEnabledForAll && (
            <label className="composer-btn" title="Datei anhängen">
              📎
              <input
                type="file"
                style={{ display: "none" }}
                onChange={(e) => e.target.files && onUploadSelected(e.target.files)}
              />
            </label>
          )}
          {voiceNoteSupported && (
            voiceNoteState === "recording" ? (
              <button className="composer-btn recording" onClick={onStopVoiceNote} title="Aufnahme stoppen">⏹</button>
            ) : (
              <button className="composer-btn" onClick={onStartVoiceNote} disabled={voiceNoteState === "uploading"} title="Sprachnachricht">
                {voiceNoteState === "uploading" ? "⏳" : "🎙"}
              </button>
            )
          )}
          <button className="composer-btn" onClick={onCreatePoll} title="Umfrage erstellen">📊</button>
          <button className="composer-btn" onClick={onSummarizeChannel} disabled={summaryLoading} title="KI-Zusammenfassung">
            {summaryLoading ? "⏳" : "✨"}
          </button>
        </div>

        {/* Textarea */}
        <textarea
          ref={composerRef}
          className="composer-input"
          rows={1}
          placeholder="Nachricht schreiben …"
          value={composerText}
          onChange={onChange}
          onKeyDown={onKeyDown}
        />

        {/* Send button */}
        <button
          className="composer-send"
          onClick={() => void onSendMessage()}
          disabled={!composerText.trim()}
          title="Senden"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
