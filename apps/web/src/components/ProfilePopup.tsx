import { useEffect, useRef } from 'react';

type Props = {
  user: { id: string; displayName: string; username?: string } | null;
  isOnline: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onOpenDM: (userId: string) => void;
  avatarColor: (id: string) => string;
  getInitials: (name: string) => string;
};

export function ProfilePopup({ user, isOnline, position, onClose, onOpenDM, avatarColor, getInitials }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [user, onClose]);

  if (!user || !position) return null;

  const top = Math.min(position.y, window.innerHeight - 220);
  const left = Math.min(position.x, window.innerWidth - 240);

  return (
    <div ref={ref} className="profile-popup" style={{ top, left }}>
      <div className="profile-popup-avatar" style={{ background: avatarColor(user.id) }}>
        {getInitials(user.displayName)}
      </div>
      <div className="profile-popup-name">{user.displayName}</div>
      {user.username && <div className="profile-popup-handle">@{user.username}</div>}
      <div className="profile-popup-status">
        <span className={`profile-popup-dot${isOnline ? ' online' : ''}`} />
        {isOnline ? 'Online' : 'Offline'}
      </div>
      <button className="profile-popup-dm" onClick={() => { onOpenDM(user.id); onClose(); }}>
        Direktnachricht senden
      </button>
    </div>
  );
}
