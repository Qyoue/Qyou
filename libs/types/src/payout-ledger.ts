// Payout-ledger reference types — shared contracts between backend reward
// records and Stellar transaction references. Closes #237.

export type PayoutStatus = 'QUEUED' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED';

export type PayoutFailureReason =
  | 'INSUFFICIENT_BALANCE'
  | 'STELLAR_SUBMISSION_ERROR'
  | 'TIMEOUT'
  | 'INVALID_DESTINATION'
  | 'UNKNOWN';

/** Immutable reference written to the backend ledger when a payout is initiated. */
export type PayoutLedgerEntry = {
  /** Internal backend reward-transaction ID. */
  rewardTxId: string;
  /** Stellar transaction hash — populated once submitted to the network. */
  stellarTxHash: string | null;
  /** Stellar account that received the payout. */
  destinationAccount: string;
  /** Amount in stroops (1 XLM = 10_000_000 stroops). */
  amountStroops: number;
  status: PayoutStatus;
  failureReason?: PayoutFailureReason;
  /** ISO-8601 timestamp of the last status change. */
  updatedAt: string;
};

/** Lightweight reference stored on the RewardTransaction for cross-system tracing. */
export type StellarPayoutRef = {
  stellarTxHash: string;
  ledger: number;
  /** Memo text echoed from the Stellar transaction. */
  memo?: string;
};

/** Result returned by the payout adapter after submission. */
export type PayoutSubmissionResult =
  | { ok: true; ref: StellarPayoutRef }
  | { ok: false; reason: PayoutFailureReason; detail?: string };

/** Query filter for fetching ledger entries by status. */
export type PayoutLedgerQuery = {
  userId?: string;
  status?: PayoutStatus;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
};
