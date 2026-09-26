import { IncentivePoolClient } from '../contracts/client.js';
import {
  RewardEligibilityService,
  type QueueIncentiveConfig,
} from '../eligibility/reward-eligibility.service.js';
import { RewardNotifier } from '../events/reward-notifier.js';
import { DistributionKillSwitch } from '../security/kill-switch.js';
import type { AccountTransactionWatcher } from '../security/transaction-watcher.js';
import { UnauthorizedDistributionError } from '../errors/stellar-error.js';
import { NetworkGuard } from '../security/network-guard.js';
import { DistributionMetricsCollector } from '../analytics/metrics.js';

export type RewardStatus = 'pending' | 'confirmed' | 'failed';

export interface RewardRecord {
  readonly id: string;
  readonly userId: string;
  readonly queueId: string;
  readonly recipient: string;
  readonly amount: string;
  readonly asset: string;
  status: RewardStatus;
  transactionHash?: string;
  error?: string;
  readonly createdAt: number;
  confirmedAt?: number;
}

export interface IncentiveServiceOptions {
  readonly client?: IncentivePoolClient;
  readonly contractId?: string;
  readonly adminSignerKey?: string;
  readonly eligibilityService?: RewardEligibilityService;
  readonly killSwitch?: DistributionKillSwitch;
  readonly transactionWatcher?: AccountTransactionWatcher;
  readonly requireInternalTrigger?: boolean;
  readonly internalTriggerSecret?: string;
  readonly allowMainnet?: boolean;
  readonly metrics?: DistributionMetricsCollector;
}

export class IncentiveService {
  private readonly _client: IncentivePoolClient;
  private readonly _eligibilityService: RewardEligibilityService;
  private readonly _killSwitch: DistributionKillSwitch;
  private readonly _transactionWatcher?: AccountTransactionWatcher;
  private readonly _requireInternalTrigger: boolean;
  private readonly _internalTriggerSecret?: string;
  private readonly _allowMainnet?: boolean;
  private readonly _metrics: DistributionMetricsCollector;
  private readonly _queueConfigs = new Map<string, QueueIncentiveConfig>();
  private readonly _rewards = new Map<string, RewardRecord>();

  constructor(options: IncentiveServiceOptions = {}) {
    this._client =
      options.client ||
      new IncentivePoolClient({
        contractId:
          options.contractId ||
          process.env.STELLAR_INCENTIVE_POOL_CONTRACT_ID ||
          'CDEFAULTTESTNETCONTRACTID1234567890',
        adminSignerKey: options.adminSignerKey || process.env.STELLAR_DISTRIBUTION_SECRET_KEY,
        allowMainnet: options.allowMainnet,
      });
    this._eligibilityService = options.eligibilityService || new RewardEligibilityService();
    this._killSwitch = options.killSwitch || DistributionKillSwitch.getInstance();
    this._transactionWatcher = options.transactionWatcher;
    this._requireInternalTrigger = options.requireInternalTrigger ?? false;
    this._internalTriggerSecret = options.internalTriggerSecret;
    this._allowMainnet = options.allowMainnet;
    this._metrics = options.metrics || DistributionMetricsCollector.getInstance();
  }

  public getClient(): IncentivePoolClient {
    return this._client;
  }

  public getKillSwitch(): DistributionKillSwitch {
    return this._killSwitch;
  }

  public getTransactionWatcher(): AccountTransactionWatcher | undefined {
    return this._transactionWatcher;
  }

  public getMetrics(): DistributionMetricsCollector {
    return this._metrics;
  }

  /**
   * Sets per-queue incentive configuration (reward amount, asset, eligibility rules). (#1017)
   */
  public setQueueConfig(config: QueueIncentiveConfig): void {
    this._queueConfigs.set(config.queueId, config);
  }

  /**
   * Retrieves per-queue incentive configuration. (#1017)
   */
  public getQueueConfig(queueId: string): QueueIncentiveConfig | null {
    return this._queueConfigs.get(queueId) || null;
  }

  /**
   * Distributes a reward to an eligible queue participant based on the queue's specific config. (#1017)
   * Enforces emergency kill switch check prior to any distribution (#1030).
   */
  public async reward(params: {
    userId: string;
    queueId: string;
    recipient: string;
    idempotencyKey?: string;
    callerContext?: {
      role?: string;
      isInternalTrigger?: boolean;
      internalSecret?: string;
    };
  }): Promise<RewardRecord> {
    // 0. Network configuration guard (#1049)
    NetworkGuard.requireTestnet('IncentiveService.reward', { allowMainnet: this._allowMainnet });

    // 1. Emergency kill switch check (#1030)
    this._killSwitch.assertNotHalted();

    // 2. Application-level access control: internal queue-completion trigger verification (#1034)
    if (this._requireInternalTrigger) {
      const isInternal =
        params.callerContext?.isInternalTrigger === true ||
        params.callerContext?.role === 'internal_queue_worker' ||
        (Boolean(this._internalTriggerSecret) &&
          params.callerContext?.internalSecret === this._internalTriggerSecret);

      if (!isInternal) {
        throw new UnauthorizedDistributionError();
      }
    }

    const { userId, queueId, recipient } = params;
    const config = this.getQueueConfig(queueId);

    if (!config) {
      throw new Error(`No incentive configuration defined for queue ${queueId}`);
    }

    const eligibility = this._eligibilityService.checkEligibility({
      userId,
      queueId,
      userWalletPublicKey: recipient,
      queueConfig: config,
    });

    if (!eligibility.eligible) {
      throw new Error(`Participant not eligible for reward: ${eligibility.reason}`);
    }

    const rewardId = `reward-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = params.idempotencyKey || `qreward:${userId}:${queueId}`;

    const record: RewardRecord = {
      id: rewardId,
      userId,
      queueId,
      recipient,
      amount: config.rewardAmount,
      asset: config.asset,
      status: 'pending',
      createdAt: Date.now(),
    };
    this._rewards.set(rewardId, record);

    this._metrics.recordAttempt();
    const startTime = Date.now();

    try {
      // Parse float amount string into integer stroops (e.g., 5.0000000 -> 50000000n)
      const numericAmount = parseFloat(config.rewardAmount);
      const stroopAmount = BigInt(Math.round(numericAmount * 10_000_000));

      const txResult = await this._client.distribute({
        recipient,
        amount: stroopAmount,
        idempotencyKey,
      });

      record.status = 'confirmed';
      record.transactionHash = txResult.txHash;
      record.confirmedAt = Date.now();

      // Register authorized outgoing transaction with transaction watcher (#1031)
      if (txResult.txHash && this._transactionWatcher) {
        this._transactionWatcher.registerAuthorizedTransaction(txResult.txHash);
      }

      this._eligibilityService.recordClaim(userId, queueId);
      RewardNotifier.getInstance().notifyConfirmed(record);

      this._metrics.recordSuccess(Date.now() - startTime);

      return record;
    } catch (err: unknown) {
      record.status = 'failed';
      record.error = err instanceof Error ? err.message : 'Unknown distribution failure';
      this._metrics.recordFailure(record.error, Date.now() - startTime);
      throw err;
    }
  }

  /**
   * Retries a previously failed reward distribution (#1039).
   */
  public async retryReward(rewardId: string): Promise<RewardRecord> {
    const record = this._rewards.get(rewardId);
    if (!record) {
      throw new Error(`Reward record not found: ${rewardId}`);
    }

    if (record.status === 'confirmed') {
      return record;
    }

    NetworkGuard.requireTestnet('IncentiveService.retryReward', { allowMainnet: this._allowMainnet });
    this._killSwitch.assertNotHalted();

    this._metrics.recordAttempt();
    const startTime = Date.now();

    const numericAmount = parseFloat(record.amount);
    const stroopAmount = BigInt(Math.round(numericAmount * 10_000_000));
    const idempotencyKey = `qreward:${record.userId}:${record.queueId}:retry:${Date.now()}`;

    try {
      const txResult = await this._client.distribute({
        recipient: record.recipient,
        amount: stroopAmount,
        idempotencyKey,
      });

      record.status = 'confirmed';
      record.transactionHash = txResult.txHash;
      record.confirmedAt = Date.now();
      record.error = undefined;

      if (txResult.txHash && this._transactionWatcher) {
        this._transactionWatcher.registerAuthorizedTransaction(txResult.txHash);
      }

      this._eligibilityService.recordClaim(record.userId, record.queueId);
      RewardNotifier.getInstance().notifyConfirmed(record);

      this._metrics.recordSuccess(Date.now() - startTime);

      return record;
    } catch (err: unknown) {
      record.status = 'failed';
      record.error = err instanceof Error ? err.message : 'Retry distribution failure';
      this._metrics.recordFailure(record.error, Date.now() - startTime);
      throw err;
    }
  }

  /**
   * Attempts reward distribution with automated retry and backoff on transient errors (#1048).
   * Ensures in-flight distributions degrade gracefully without silently losing payout state.
   */
  public async rewardWithRetry(
    params: {
      userId: string;
      queueId: string;
      recipient: string;
      idempotencyKey?: string;
      callerContext?: {
        role?: string;
        isInternalTrigger?: boolean;
        internalSecret?: string;
      };
    },
    retryConfig: {
      maxAttempts?: number;
      initialDelayMs?: number;
      backoffFactor?: number;
    } = {}
  ): Promise<RewardRecord> {
    const maxAttempts = retryConfig.maxAttempts ?? 3;
    const initialDelayMs = retryConfig.initialDelayMs ?? 15;
    const backoffFactor = retryConfig.backoffFactor ?? 2;

    let attempt = 1;
    let createdRecordId: string | null = null;

    while (attempt <= maxAttempts) {
      try {
        if (!createdRecordId) {
          const record = await this.reward(params);
          return record;
        } else {
          const record = await this.retryReward(createdRecordId);
          return record;
        }
      } catch (err: unknown) {
        // Locate in-flight record if it was stored
        if (!createdRecordId) {
          const matching = Array.from(this._rewards.values()).find(
            (r) =>
              r.userId === params.userId &&
              r.queueId === params.queueId &&
              r.recipient === params.recipient
          );
          if (matching) {
            createdRecordId = matching.id;
          }
        }

        if (attempt >= maxAttempts) {
          throw err;
        }

        const delay = initialDelayMs * Math.pow(backoffFactor, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        attempt++;
      }
    }

    throw new Error('Reward distribution exceeded maximum retry attempts');
  }

  public async getPoolBalance(): Promise<bigint> {
    return this._client.getBalance();
  }

  public getReward(rewardId: string): RewardRecord | null {
    return this._rewards.get(rewardId) || null;
  }

  public getAllRewards(): RewardRecord[] {
    return Array.from(this._rewards.values());
  }
}
