// Browser session persistence — survives refresh, not tab close.

const SESSION_KEY = "pulse-session-id";
const RECONNECT_KEY = "pulse-pending-reconnect";
const RECONNECT_MAX_AGE_MS = 30_000;

export function getOrCreateSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function savePendingReconnect(peerId: string) {
  sessionStorage.setItem(
    RECONNECT_KEY,
    JSON.stringify({ peerId, at: Date.now() }),
  );
}

export function hasPendingReconnect(): boolean {
  const raw = sessionStorage.getItem(RECONNECT_KEY);
  if (!raw) return false;
  try {
    const { at } = JSON.parse(raw) as { at?: number };
    return typeof at === "number" && Date.now() - at <= RECONNECT_MAX_AGE_MS;
  } catch {
    return false;
  }
}

/** Read and clear pending reconnect intent (call once on mount). */
export function consumePendingReconnect(): { peerId: string } | null {
  const raw = sessionStorage.getItem(RECONNECT_KEY);
  sessionStorage.removeItem(RECONNECT_KEY);
  if (!raw) return null;
  try {
    const { peerId, at } = JSON.parse(raw) as { peerId?: string; at?: number };
    if (
      typeof peerId !== "string" ||
      typeof at !== "number" ||
      Date.now() - at > RECONNECT_MAX_AGE_MS
    ) {
      return null;
    }
    return { peerId };
  } catch {
    return null;
  }
}

export function clearPendingReconnect() {
  sessionStorage.removeItem(RECONNECT_KEY);
}
