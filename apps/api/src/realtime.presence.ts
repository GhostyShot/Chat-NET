const activeSockets = new Map<string, Set<string>>();
const lastSeenAt = new Map<string, number>();

export function markConnected(userId: string, socketId: string) {
  const current = activeSockets.get(userId) ?? new Set<string>();
  current.add(socketId);
  activeSockets.set(userId, current);
}

export function markDisconnected(userId: string, socketId: string) {
  const current = activeSockets.get(userId);
  if (!current) {
    return;
  }

  current.delete(socketId);
  if (current.size === 0) {
    activeSockets.delete(userId);
    lastSeenAt.set(userId, Date.now());
  }
}

export function isOnline(userId: string): boolean {
  return (activeSockets.get(userId)?.size ?? 0) > 0;
}

export function getPresence(userId: string) {
  return {
    userId,
    online: isOnline(userId),
    lastSeenAt: isOnline(userId) ? null : (lastSeenAt.get(userId) ?? null)
  };
}

export function getBulkPresence(userIds: string[]) {
  return userIds.map((userId) => getPresence(userId));
}