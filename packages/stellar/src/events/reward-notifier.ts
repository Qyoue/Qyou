import type { RewardRecord } from '../services/incentive.service.js';

export type RewardNotificationListener = (reward: RewardRecord) => void | Promise<void>;

export class RewardNotifier {
  private static _instance: RewardNotifier | null = null;
  private readonly _listeners = new Set<RewardNotificationListener>();

  public static getInstance(): RewardNotifier {
    if (!this._instance) {
      this._instance = new RewardNotifier();
    }
    return this._instance;
  }

  public subscribe(listener: RewardNotificationListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  public notifyConfirmed(reward: RewardRecord): void {
    if (reward.status !== 'confirmed') return;

    for (const listener of this._listeners) {
      try {
        const result = listener(reward);
        if (result instanceof Promise) {
          result.catch((err) => console.error('[RewardNotifier] Listener error:', err));
        }
      } catch (err) {
        console.error('[RewardNotifier] Listener exception:', err);
      }
    }
  }

  public clear(): void {
    this._listeners.clear();
  }
}
