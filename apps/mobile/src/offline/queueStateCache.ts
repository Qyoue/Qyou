/**
 * Offline queue-state cache (#1356).
 *
 * Keeps the last successfully fetched queue state so the app can show it, marked
 * as stale, when the device is offline. Storage is injected (AsyncStorage-like), so
 * the cache itself has no native dependency and is unit-testable.
 */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface CachedValue<T> {
  value: T;
  savedAt: number;
  /** True when older than the cache's `maxAgeMs`. */
  stale: boolean;
}

export interface QueueStateCacheOptions {
  storage: KeyValueStorage;
  /** Entries older than this are reported as stale (still returned). Default 5 minutes. */
  maxAgeMs?: number;
  now?: () => number;
  keyPrefix?: string;
}

export class QueueStateCache<T = unknown> {
  private readonly storage: KeyValueStorage;
  private readonly maxAgeMs: number;
  private readonly now: () => number;
  private readonly prefix: string;

  constructor(options: QueueStateCacheOptions) {
    this.storage = options.storage;
    this.maxAgeMs = options.maxAgeMs ?? 5 * 60_000;
    this.now = options.now ?? Date.now;
    this.prefix = options.keyPrefix ?? 'qyou.queueState.';
  }

  async save(queueId: string, value: T): Promise<void> {
    await this.storage.setItem(this.prefix + queueId, JSON.stringify({ value, savedAt: this.now() }));
  }

  async load(queueId: string): Promise<CachedValue<T> | null> {
    const raw = await this.storage.getItem(this.prefix + queueId);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { value: T; savedAt: number };
      if (typeof parsed.savedAt !== 'number') return null;
      return { value: parsed.value, savedAt: parsed.savedAt, stale: this.now() - parsed.savedAt > this.maxAgeMs };
    } catch {
      await this.storage.removeItem(this.prefix + queueId);
      return null;
    }
  }

  async clear(queueId: string): Promise<void> {
    await this.storage.removeItem(this.prefix + queueId);
  }
}

/**
 * Network-first with cache fallback: a successful fetch refreshes the cache; a failed
 * fetch returns the cached value (if any) flagged `fromCache`. Rethrows when nothing is cached.
 */
export async function fetchWithOfflineCache<T>(
  cache: QueueStateCache<T>,
  queueId: string,
  fetcher: () => Promise<T>,
): Promise<{ value: T; fromCache: boolean; stale: boolean; savedAt?: number }> {
  try {
    const value = await fetcher();
    await cache.save(queueId, value).catch(() => undefined);
    return { value, fromCache: false, stale: false };
  } catch (error) {
    const cached = await cache.load(queueId);
    if (!cached) throw error;
    return { value: cached.value, fromCache: true, stale: cached.stale, savedAt: cached.savedAt };
  }
}
