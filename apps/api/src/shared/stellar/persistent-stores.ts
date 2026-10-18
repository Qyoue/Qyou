/**
 * Shared-state stores for the Stellar security components (#1139-#1142). They target a minimal
 * key-value interface that Redis (or a DB-backed adapter) can implement, so state survives
 * restarts and is shared across instances. Nothing here is wired into `kill-switch.ts`,
 * `wallet-challenge.service.ts`, `abuse-detector.ts` or `distribution-guard.ts` yet.
 */
export interface SharedKv {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  /** Set only if absent; resolves true when this call created the key (atomic, e.g. `SET NX`). */
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  del(key: string): Promise<void>;
  /** Atomically add 1 (creating the key at 1 with the TTL) and return the new value. */
  incr(key: string, ttlSeconds: number): Promise<number>;
}

// ---- #1139 kill switch ----
export interface KillSwitchState {
  halted: boolean;
  reason?: string;
  at?: string;
}

export class SharedKillSwitchStorage {
  constructor(private readonly kv: SharedKv, private readonly key = 'stellar:kill-switch') {}

  async read(): Promise<KillSwitchState> {
    const raw = await this.kv.get(this.key);
    return raw ? (JSON.parse(raw) as KillSwitchState) : { halted: false };
  }

  async write(state: KillSwitchState): Promise<void> {
    await this.kv.set(this.key, JSON.stringify({ ...state, at: new Date().toISOString() }));
  }
}

/** Boot guard: production must not run on process-local storage. */
export function assertSharedStorage(storage: object, env: string | undefined): void {
  if (env === 'production' && storage.constructor.name.startsWith('InMemory')) {
    throw new Error(`${storage.constructor.name} is not allowed in production; configure shared storage`);
  }
}

// ---- #1140 wallet challenge nonces ----
export class SharedNonceStore {
  constructor(private readonly kv: SharedKv, private readonly ttlSeconds = 300) {}

  /** Remember an issued nonce. */
  async issue(nonce: string): Promise<void> {
    await this.kv.set(`stellar:nonce:${nonce}`, 'issued', this.ttlSeconds);
  }

  /**
   * Consume once. The `used` marker is created atomically, so a replay (same or other instance)
   * gets false; an expired or unknown nonce also gets false.
   */
  async consume(nonce: string): Promise<boolean> {
    if ((await this.kv.get(`stellar:nonce:${nonce}`)) !== 'issued') return false;
    return this.kv.setIfAbsent(`stellar:nonce-used:${nonce}`, '1', this.ttlSeconds);
  }
}

// ---- #1141 abuse counters (fixed buckets approximate a sliding window) ----
export class SharedSlidingCounter {
  constructor(private readonly kv: SharedKv, private readonly windowSeconds: number, private readonly buckets = 6, private readonly now: () => number = Date.now) {}

  /** Record one event and return the approximate count in the last window. */
  async hit(subject: string): Promise<number> {
    const size = Math.ceil(this.windowSeconds / this.buckets);
    const bucket = Math.floor(this.now() / 1000 / size);
    await this.kv.incr(`stellar:abuse:${subject}:${bucket}`, this.windowSeconds + size);
    let total = 0;
    for (let i = 0; i < this.buckets; i++) {
      total += Number((await this.kv.get(`stellar:abuse:${subject}:${bucket - i}`)) ?? 0);
    }
    return total;
  }
}

// ---- #1142 daily distribution totals from persisted rows ----
export interface RewardSums {
  /** Sum of reward amounts (excluding FAILED) created at or after `since`; implemented with Prisma `aggregate`. */
  sumSince(userId: string | null, since: Date): Promise<number>;
}

export class PersistedDistributionGuard {
  constructor(private readonly rewards: RewardSums, private readonly dailyCap: number, private readonly perUserCap: number, private readonly now: () => Date = () => new Date()) {}

  private startOfDayUtc(): Date {
    const d = this.now();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  /** Caps come from stored rows, so a restart cannot reset them. */
  async check(userId: string, amount: number): Promise<{ allowed: boolean; reason?: string }> {
    const since = this.startOfDayUtc();
    if ((await this.rewards.sumSince(null, since)) + amount > this.dailyCap) return { allowed: false, reason: 'daily cap' };
    if ((await this.rewards.sumSince(userId, since)) + amount > this.perUserCap) return { allowed: false, reason: 'per-user cap' };
    return { allowed: true };
  }
}
