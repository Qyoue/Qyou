/**
 * Transaction Amount Limits & Anomaly Detection (#1027)
 *
 * Enforces per-transaction caps and daily rolling velocity limits on incentive payouts,
 * and emits anomaly warnings for unexpected payout sizes.
 */

export interface DistributionGuardOptions {
  readonly maxPerTransaction?: number; // e.g. 50.0 XLM
  readonly maxDailyVolume?: number;    // e.g. 1000.0 XLM
  readonly alertThresholdRatio?: number; // e.g. 3x standard reward
}

export interface DistributionCheckResult {
  readonly allowed: boolean;
  readonly reason?: string;
  readonly isAnomaly: boolean;
  readonly currentDailyTotal: number;
}

export class DistributionGuard {
  private readonly _maxPerTransaction: number;
  private readonly _maxDailyVolume: number;
  private readonly _alertThresholdRatio: number;
  private readonly _dailyTransactions: Array<{ amount: number; timestamp: number }> = [];

  constructor(options: DistributionGuardOptions = {}) {
    this._maxPerTransaction = options.maxPerTransaction ?? 50.0;
    this._maxDailyVolume = options.maxDailyVolume ?? 1000.0;
    this._alertThresholdRatio = options.alertThresholdRatio ?? 3.0;
  }

  /**
   * Prunes records older than 24 hours (86,400,000 ms).
   */
  private pruneOldRecords(now: number): void {
    const oneDayAgo = now - 86_400_000;
    while (this._dailyTransactions.length > 0 && this._dailyTransactions[0].timestamp < oneDayAgo) {
      this._dailyTransactions.shift();
    }
  }

  /**
   * Evaluates whether a proposed distribution amount is within safety limits.
   */
  public evaluate(amountNumeric: number, standardQueueReward = 5.0): DistributionCheckResult {
    const now = Date.now();
    this.pruneOldRecords(now);

    // 1. Negative or zero amount check
    if (amountNumeric <= 0) {
      return {
        allowed: false,
        reason: 'Distribution amount must be strictly positive',
        isAnomaly: true,
        currentDailyTotal: this.getCurrentDailyVolume(),
      };
    }

    // 2. Per-transaction limit
    if (amountNumeric > this._maxPerTransaction) {
      return {
        allowed: false,
        reason: `Amount exceeds maximum per-transaction cap of ${this._maxPerTransaction} XLM`,
        isAnomaly: true,
        currentDailyTotal: this.getCurrentDailyVolume(),
      };
    }

    // 3. Daily volume limit check
    const currentVolume = this.getCurrentDailyVolume();
    if (currentVolume + amountNumeric > this._maxDailyVolume) {
      return {
        allowed: false,
        reason: `Transaction would exceed 24-hour distribution limit (${this._maxDailyVolume} XLM)`,
        isAnomaly: true,
        currentDailyTotal: currentVolume,
      };
    }

    // 4. Anomaly detection (e.g. payout is > 3x standard queue reward)
    const isAnomaly = amountNumeric >= standardQueueReward * this._alertThresholdRatio;

    return {
      allowed: true,
      isAnomaly,
      currentDailyTotal: currentVolume,
    };
  }

  /**
   * Commits a successful distribution into rolling daily volume accounting.
   */
  public commit(amountNumeric: number): void {
    this._dailyTransactions.push({
      amount: amountNumeric,
      timestamp: Date.now(),
    });
  }

  public getCurrentDailyVolume(): number {
    this.pruneOldRecords(Date.now());
    return this._dailyTransactions.reduce((acc, tx) => acc + tx.amount, 0);
  }

  public reset(): void {
    this._dailyTransactions.length = 0;
  }
}
