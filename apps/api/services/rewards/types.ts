import { RewardLedgerEntryStatus, RewardLedgerEntryType } from '../../models/RewardLedgerEntry';

export type RewardLedgerEntryRecord = {
  id: string;
  userId: string;
  amount: number;
  type: RewardLedgerEntryType;
  status: RewardLedgerEntryStatus;
  reference: string;
  source: string;
  memo?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type RewardBalance = {
  available: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
};

export type RecordRewardInput = {
  userId: string;
  amount: number;
  type: RewardLedgerEntryType;
  source: string;
  reference?: string;
  memo?: string;
  metadata?: Record<string, unknown>;
  status?: RewardLedgerEntryStatus;
};

export interface RewardService {
  getBalance(userId: string): Promise<RewardBalance>;
  getHistory(userId: string): Promise<RewardLedgerEntryRecord[]>;
  recordEntry(input: RecordRewardInput): Promise<RewardLedgerEntryRecord>;
}
