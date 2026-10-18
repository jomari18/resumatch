type Kind = "local" | "session";

export const STORAGE_KEYS = {
  lastResult: "resumatch:last-result",
  deleteToken: (id: string) => `resumatch:delete:${id}`,
} as const;

function storage(kind: Kind): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Storage can throw in private mode or when blocked; these helpers never do. */
export function safeGet(kind: Kind, key: string): string | null {
  try {
    return storage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeSet(kind: Kind, key: string, value: string): boolean {
  try {
    const s = storage(kind);
    if (!s) return false;
    s.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemove(kind: Kind, key: string): void {
  try {
    storage(kind)?.removeItem(key);
  } catch {
    // Nothing to do: the value simply stays until storage works again.
  }
}
