/**
 * Rewards-history mapping contracts.
 *
 * These types define the shape of reward history data as it flows between
 * the Stellar client, the backend API, and consuming clients.
 * They are intentionally backend-agnostic so they can be used before
 * full persistence is implemented.
 */

import type { TransactionType, TransactionStatus } from './rewards';

/** A single reward history entry as returned by the API */
export type RewardHistoryItem = {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  /** Unix timestamp (ms) */
  timestamp: number;
  memo?: string;
  /** Stellar transaction hash, present when the transaction has been submitted */
  stellarTxHash?: string;
};

/** Paginated reward history response */
export type RewardHistoryPage = {
  items: RewardHistoryItem[];
  total: number;
  page: number;
  limit: number;
};

/** Request parameters for fetching reward history */
export type RewardHistoryQuery = {
  userId: string;
  page?: number;
  limit?: number;
  type?: TransactionType;
  status?: TransactionStatus;
};

/** Mapping from a MockRewardService transaction to a RewardHistoryItem */
export const toRewardHistoryItem = (tx: {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  timestamp: number;
  memo?: string;
}): RewardHistoryItem => ({
  id: tx.id,
  userId: tx.userId,
  amount: tx.amount,
  type: tx.type,
  status: tx.status,
  timestamp: tx.timestamp,
  memo: tx.memo,
});
