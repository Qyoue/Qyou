import type { IncentiveStore, QueueIncentiveConfig, RewardRecord } from '@qyou/stellar';

/**
 * Prisma-backed IncentiveStore (#1359). Structural delegate types are used so this compiles
 * against the generated client without importing it (models: `Reward`, `QueueIncentiveConfig`).
 */
interface RewardRow {
  id: string;
  userId: string;
  queueId: string;
  recipient: string;
  amount: string;
  asset: string;
  status: string;
  transactionHash: string | null;
  error: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
}

interface ConfigRow {
  queueId: string;
  enabled: boolean;
  rewardAmount: string;
  asset: string;
  maxRewardsPerUser: number | null;
}

export interface PrismaIncentiveClient {
  reward: {
    upsert(args: unknown): Promise<unknown>;
    findMany(args?: unknown): Promise<RewardRow[]>;
    findUnique(args: unknown): Promise<RewardRow | null>;
  };
  queueIncentiveConfig: {
    upsert(args: unknown): Promise<unknown>;
    findMany(args?: unknown): Promise<ConfigRow[]>;
  };
}

const toRecord = (row: RewardRow): RewardRecord => ({
  id: row.id,
  userId: row.userId,
  queueId: row.queueId,
  recipient: row.recipient,
  amount: row.amount,
  asset: row.asset,
  status: row.status as RewardRecord['status'],
  transactionHash: row.transactionHash ?? undefined,
  error: row.error ?? undefined,
  createdAt: row.createdAt.getTime(),
  confirmedAt: row.confirmedAt?.getTime(),
});

export class PrismaIncentiveStore implements IncentiveStore {
  constructor(private readonly prisma: PrismaIncentiveClient) {}

  async saveReward(record: RewardRecord, idempotencyKey?: string): Promise<void> {
    const data = {
      userId: record.userId,
      queueId: record.queueId,
      recipient: record.recipient,
      amount: record.amount,
      asset: record.asset,
      status: record.status,
      transactionHash: record.transactionHash ?? null,
      error: record.error ?? null,
      createdAt: new Date(record.createdAt),
      confirmedAt: record.confirmedAt ? new Date(record.confirmedAt) : null,
      ...(idempotencyKey ? { idempotencyKey } : {}),
    };
    await this.prisma.reward.upsert({
      where: { id: record.id },
      create: { id: record.id, ...data },
      update: data,
    });
  }

  async listRewards(): Promise<RewardRecord[]> {
    return (await this.prisma.reward.findMany({ orderBy: { createdAt: 'asc' } })).map(toRecord);
  }

  async getRewardIdByIdempotencyKey(key: string): Promise<string | null> {
    const row = await this.prisma.reward.findUnique({ where: { idempotencyKey: key } });
    return row?.id ?? null;
  }

  async saveQueueConfig(config: QueueIncentiveConfig): Promise<void> {
    const data = {
      enabled: config.enabled,
      rewardAmount: config.rewardAmount,
      asset: config.asset,
      maxRewardsPerUser: config.maxRewardsPerUser ?? null,
    };
    await this.prisma.queueIncentiveConfig.upsert({
      where: { queueId: config.queueId },
      create: { queueId: config.queueId, ...data },
      update: data,
    });
  }

  async listQueueConfigs(): Promise<QueueIncentiveConfig[]> {
    return (await this.prisma.queueIncentiveConfig.findMany()).map((row) => ({
      queueId: row.queueId,
      enabled: row.enabled,
      rewardAmount: row.rewardAmount,
      asset: row.asset,
      maxRewardsPerUser: row.maxRewardsPerUser ?? undefined,
    }));
  }
}
