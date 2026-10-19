import type { IncentiveService } from './services/incentive.service.js';

/**
 * Reward history user endpoint service and queue-completion reward event listener.
 */

export interface RewardHistoryEntry {
  id: string;
  userId: string;
  queueId: string;
  rewardAmount: string;
  asset: string;
  createdAt: string;
}

export class RewardHistoryService {
  private records: RewardHistoryEntry[] = [];

  public recordReward(userId: string, queueId: string, amount: string, asset: string = 'QYOU'): RewardHistoryEntry {
    const entry: RewardHistoryEntry = {
      id: newId('rw'),
      userId,
      queueId,
      rewardAmount: amount,
      asset,
      createdAt: new Date().toISOString(),
    };
    this.records.push(entry);
    return entry;
  }

  public getUserRewardHistory(userId: string): RewardHistoryEntry[] {
    return this.records.filter(r => r.userId === userId);
  }
}

/**
 * @deprecated Delegates to IncentiveService so eligibility, kill switch, abuse and idempotency guards apply.
 */
export class QueueCompletionRewardListener {
  constructor(private incentive: Pick<IncentiveService, 'reward'>) {}

  public async onQueueCompleted(userId: string, queueId: string, recipient: string): Promise<void> {
    await this.incentive.reward({ userId, queueId, recipient, idempotencyKey: `${userId}:${queueId}` });
  }
}
