import { IncentivePoolClient } from '../contracts/client.js';
import {
  RewardEligibilityService,
  type QueueIncentiveConfig,
} from '../eligibility/reward-eligibility.service.js';
import { RewardNotifier } from '../events/reward-notifier.js';
import { DistributionKillSwitch } from '../security/kill-switch.js';
import type { AccountTransactionWatcher } from '../security/transaction-watcher.js';

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
}

export class IncentiveService {
  private readonly _client: IncentivePoolClient;
  private readonly _eligibilityService: RewardEligibilityService;
  private readonly _killSwitch: DistributionKillSwitch;
  private readonly _transactionWatcher?: AccountTransactionWatcher;
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
      });
    this._eligibilityService = options.eligibilityService || new RewardEligibilityService();
    this._killSwitch = options.killSwitch || DistributionKillSwitch.getInstance();
    this._transactionWatcher = options.transactionWatcher;
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
  }): Promise<RewardRecord> {
    // 1. Emergency kill switch check (#1030)
    this._killSwitch.assertNotHalted();

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

      return record;
    } catch (err: unknown) {
      record.status = 'failed';
      record.error = err instanceof Error ? err.message : 'Unknown distribution failure';
      throw err;
    }
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
