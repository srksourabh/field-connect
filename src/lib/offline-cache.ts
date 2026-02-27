const PREFIX = "uds_cache_";

export function cacheSet(userId: string, key: string, data: unknown): void {
  if (typeof window === "undefined") return;
  try {
    const storageKey = `${PREFIX}${userId}_${key}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify({ data, updatedAt: Date.now() })
    );
  } catch {
    // ignore quota or serialization errors
  }
}

export function cacheGet<T>(userId: string, key: string): { data: T; updatedAt: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const storageKey = `${PREFIX}${userId}_${key}`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;
    return JSON.parse(stored) as { data: T; updatedAt: number };
  } catch {
    return null;
  }
}
