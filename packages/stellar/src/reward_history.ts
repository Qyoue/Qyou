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
      id: `rw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

export class QueueCompletionRewardListener {
  constructor(private rewardService: RewardHistoryService) {}

  public async onQueueCompleted(userId: string, queueId: string): Promise<void> {
    // Reward user with 10 QYOU tokens on queue completion
    this.rewardService.recordReward(userId, queueId, '10.0');
  }
}
