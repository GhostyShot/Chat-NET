import { useEffect, useRef, useState } from 'react';
import type { MessageItem, ChannelItem } from '../lib/api';

type Props = {
  open: boolean;
  onClose: () => void;
  channels: ChannelItem[];
  results: MessageItem[];
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  onJump: (channelId: string, messageId: string) => void;
  getChannelDisplayName: (c: ChannelItem | null) => string;
  formatTimeLabel: (v?: string) => string;
};

export function SearchModal({
  open, onClose, channels, results, query, onQueryChange, onSearch, onJump, getChannelDisplayName, formatTimeLabel
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (open) { setIdx(0); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && results[idx]) {
        const r = results[idx];
        if (r.channelId) onJump(r.channelId, r.id);
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, results, idx, onClose, onJump]);

  if (!open) return null;

  const chanById = new Map(channels.map(c => [c.id, c]));

  return (
    <div className="search-modal-backdrop" onClick={onClose}>
      <div className="search-modal" onClick={e => e.stopPropagation()}>
        <div className="search-modal-input">
          <span className="search-modal-icon">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { onQueryChange(e.target.value); }}
            onKeyDown={e => { if (e.key === 'Enter') onSearch(); }}
            placeholder="Nachrichten suchen…"
          />
          <span className="search-modal-kbd">esc</span>
        </div>
        <div className="search-modal-results">
          {results.length === 0 && query.trim() && (
            <div className="search-modal-empty">Keine Treffer für „{query}“</div>
          )}
          {results.length === 0 && !query.trim() && (
            <div className="search-modal-empty">Suchbegriff eingeben und Enter drücken</div>
          )}
          {results.map((r, i) => {
            const ch = r.channelId ? chanById.get(r.channelId) : null;
            return (
              <div
                key={r.id}
                className={`search-modal-result${i === idx ? ' active' : ''}`}
                onClick={() => { if (r.channelId) onJump(r.channelId, r.id); onClose(); }}
              >
                <span className="search-modal-result-sender">{r.sender.displayName}</span>
                <span className="search-modal-result-content">{r.content}</span>
                <span className="search-modal-result-meta">
                  {ch ? getChannelDisplayName(ch) : ''} · {formatTimeLabel(r.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
