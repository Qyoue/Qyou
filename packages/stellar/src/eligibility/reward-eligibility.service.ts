export interface QueueIncentiveConfig {
  readonly queueId: string;
  readonly enabled: boolean;
  readonly rewardAmount: string;
  readonly asset: string;
  readonly maxRewardsPerUser?: number;
}

export interface EligibilityCheckParams {
  readonly userId: string;
  readonly queueId: string;
  readonly userWalletPublicKey?: string | null;
  readonly queueConfig?: QueueIncentiveConfig | null;
  readonly priorClaimCount?: number;
}

export interface RewardEligibilityResult {
  readonly eligible: boolean;
  readonly reason?: string;
  readonly rewardAmount?: string;
  readonly asset?: string;
}

export class RewardEligibilityService {
  private readonly _claimsByUserAndQueue = new Map<string, number>();

  /**
   * Evaluates whether a user joining a queue is eligible for a Stellar incentive reward.
   */
  public checkEligibility(params: EligibilityCheckParams): RewardEligibilityResult {
    const { userId, queueId, userWalletPublicKey, queueConfig } = params;

    // 1. Queue incentive configuration check
    if (!queueConfig || !queueConfig.enabled) {
      return {
        eligible: false,
        reason: 'Queue does not have active Stellar incentive rewards configured.',
      };
    }

    // 2. User linked wallet verification
    if (!userWalletPublicKey) {
      return {
        eligible: false,
        reason: 'User must link a verified Stellar wallet to be eligible for rewards.',
      };
    }

    // Validate key format
    if (!/^G[A-Z2-7]{55}$/.test(userWalletPublicKey)) {
      return {
        eligible: false,
        reason: 'User linked Stellar public key format is invalid.',
      };
    }

    // 3. User reward frequency / repeat join check
    const key = `${userId}:${queueId}`;
    const priorClaims = params.priorClaimCount ?? (this._claimsByUserAndQueue.get(key) || 0);
    const maxAllowed = queueConfig.maxRewardsPerUser ?? 1;

    if (priorClaims >= maxAllowed) {
      return {
        eligible: false,
        reason: `Maximum reward limit reached (${maxAllowed} per user for this queue).`,
      };
    }

    // Eligible!
    return {
      eligible: true,
      rewardAmount: queueConfig.rewardAmount,
      asset: queueConfig.asset,
    };
  }

  /**
   * Records a successfully distributed or claimed reward for a user and queue.
   */
  public recordClaim(userId: string, queueId: string): void {
    const key = `${userId}:${queueId}`;
    const current = this._claimsByUserAndQueue.get(key) || 0;
    this._claimsByUserAndQueue.set(key, current + 1);
  }

  /**
   * Resets claim records (useful for test resets).
   */
  public reset(): void {
    this._claimsByUserAndQueue.clear();
  }
}
