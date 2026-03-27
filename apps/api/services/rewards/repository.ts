import { Types } from 'mongoose';
import { RewardLedgerEntry, RewardLedgerEntryDocument } from '../../models/RewardLedgerEntry';
import { RewardBalance, RewardLedgerEntryRecord, RecordRewardInput } from './types';

const toRecord = (entry: RewardLedgerEntryDocument & { _id: Types.ObjectId }): RewardLedgerEntryRecord => ({
  id: String(entry._id),
  userId: String(entry.userId),
  amount: entry.amount,
  type: entry.type,
  status: entry.status,
  reference: entry.reference,
  source: entry.source,
  memo: entry.memo,
  metadata: entry.metadata,
  createdAt: entry.createdAt,
  updatedAt: entry.updatedAt,
});

export const rewardLedgerRepository = {
  async createEntry(input: RecordRewardInput): Promise<RewardLedgerEntryRecord> {
    const entry = await RewardLedgerEntry.create({
      userId: new Types.ObjectId(input.userId),
      amount: input.amount,
      type: input.type,
      status: input.status || 'CONFIRMED',
      reference:
        input.reference ||
        `${input.source}-${new Types.ObjectId().toString()}-${Date.now()}`,
      source: input.source,
      memo: input.memo,
      metadata: input.metadata,
    });

    return toRecord(entry);
  },

  async findHistory(userId: string): Promise<RewardLedgerEntryRecord[]> {
    const rows = await RewardLedgerEntry.find({
      userId: new Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .lean();

    return rows.map((row) => ({
      id: String(row._id),
      userId: String(row.userId),
      amount: row.amount,
      type: row.type,
      status: row.status,
      reference: row.reference,
      source: row.source,
      memo: row.memo,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  },

  async getBalance(userId: string): Promise<RewardBalance> {
    const rows = await RewardLedgerEntry.find({
      userId: new Types.ObjectId(userId),
      status: 'CONFIRMED',
    }).lean();

    let available = 0;
    let lifetimeEarned = 0;
    let lifetimeSpent = 0;

    for (const row of rows) {
      const normalizedAmount =
        row.type === 'GRANT' || row.type === 'ADJUSTMENT' ? row.amount : -Math.abs(row.amount);

      available += normalizedAmount;

      if (row.type === 'GRANT' || row.type === 'ADJUSTMENT') {
        lifetimeEarned += Math.max(0, row.amount);
      } else {
        lifetimeSpent += Math.abs(row.amount);
      }
    }

    return {
      available,
      lifetimeEarned,
      lifetimeSpent,
    };
  },
};
