/**
 * Transaction status enums aligned with backend reward and payout concepts.
 * Mirrors the shared RewardTransactionStatus in libs/types while adding
 * Stellar-specific settlement states for cleaner shared-state mapping.
 */

/** Core lifecycle states shared with the backend reward service */
export type RewardStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

/** Extended payout states for Stellar settlement flows */
export type PayoutStatus =
  | 'INITIATED'
  | 'SUBMITTED'
  | 'SETTLED'
  | 'REVERSED'
  | 'EXPIRED';

/** Union covering all states a transaction can occupy */
export type TxStatus = RewardStatus | PayoutStatus;

/** Maps a Stellar Horizon transaction result to a RewardStatus */
export function toRewardStatus(horizonResult: string): RewardStatus {
  switch (horizonResult) {
    case 'SUCCESS':
      return 'CONFIRMED';
    case 'FAILED':
    case 'TOO_LATE':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

/** Maps a RewardStatus to the equivalent PayoutStatus for settlement tracking */
export function toPayoutStatus(status: RewardStatus): PayoutStatus {
  const map: Record<RewardStatus, PayoutStatus> = {
    PENDING: 'SUBMITTED',
    CONFIRMED: 'SETTLED',
    FAILED: 'REVERSED',
  };
  return map[status];
}

/** Returns true when a status represents a terminal (non-retryable) state */
export function isTerminal(status: TxStatus): boolean {
  const terminal: TxStatus[] = ['CONFIRMED', 'FAILED', 'SETTLED', 'REVERSED', 'EXPIRED'];
  return terminal.includes(status);
}
