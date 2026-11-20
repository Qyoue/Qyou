import type { QueueIncentiveConfig } from '../eligibility/reward-eligibility.service.js';
import type { RewardRecord } from './incentive.service.js';

/**
 * Persistence for the incentive service (#1359): rewards, idempotency keys and per-queue
 * incentive configuration. `IncentiveService` keeps working from in-memory maps; when a
 * store is supplied it writes through to it, consults it for idempotency, and can
 * `hydrate()` its maps on start so a restart does not forget payouts.
 */
export interface IncentiveStore {
  saveReward(record: RewardRecord, idempotencyKey?: string): Promise<void>;
  listRewards(): Promise<RewardRecord[]>;
  /** The reward id previously recorded for this idempotency key, if any. */
  getRewardIdByIdempotencyKey(key: string): Promise<string | null>;
  saveQueueConfig(config: QueueIncentiveConfig): Promise<void>;
  listQueueConfigs(): Promise<QueueIncentiveConfig[]>;
}

/** Reference implementation, also useful in tests. Not durable. */
export class InMemoryIncentiveStore implements IncentiveStore {
  private readonly rewards = new Map<string, RewardRecord>();
  private readonly keys = new Map<string, string>();
  private readonly configs = new Map<string, QueueIncentiveConfig>();

  async saveReward(record: RewardRecord, idempotencyKey?: string): Promise<void> {
    this.rewards.set(record.id, { ...record });
    if (idempotencyKey) this.keys.set(idempotencyKey, record.id);
  }
  async listRewards(): Promise<RewardRecord[]> {
    return [...this.rewards.values()].map((r) => ({ ...r }));
  }
  async getRewardIdByIdempotencyKey(key: string): Promise<string | null> {
    return this.keys.get(key) ?? null;
  }
  async saveQueueConfig(config: QueueIncentiveConfig): Promise<void> {
    this.configs.set(config.queueId, { ...config });
  }
  async listQueueConfigs(): Promise<QueueIncentiveConfig[]> {
    return [...this.configs.values()];
  }
}
