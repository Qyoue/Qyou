export type PayoutFailureCode =
  | 'INSUFFICIENT_BALANCE'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_NOT_TRUSTED'
  | 'TRANSACTION_REJECTED'
  | 'NETWORK_TIMEOUT'
  | 'HORIZON_ERROR'
  | 'INVALID_DESTINATION'
  | 'MEMO_TOO_LONG'
  | 'FEE_TOO_LOW'
  | 'ESCROW_LOCKED'
  | 'ESCROW_EXPIRED'
  | 'BUDDY_DISPUTE_OPEN'
  | 'UNKNOWN';

export type PayoutFailureSeverity = 'retryable' | 'terminal' | 'manual_review';

export interface PayoutFailureReason {
  code: PayoutFailureCode;
  severity: PayoutFailureSeverity;
  message: string;
  retryAfterMs?: number;
}

export const PAYOUT_FAILURE_REASONS: Record<PayoutFailureCode, PayoutFailureReason> = {
  INSUFFICIENT_BALANCE:   { code: 'INSUFFICIENT_BALANCE',   severity: 'retryable',     message: 'Sender balance too low',              retryAfterMs: 60_000 },
  ACCOUNT_NOT_FOUND:      { code: 'ACCOUNT_NOT_FOUND',      severity: 'terminal',      message: 'Destination account does not exist' },
  ACCOUNT_NOT_TRUSTED:    { code: 'ACCOUNT_NOT_TRUSTED',    severity: 'manual_review', message: 'Destination has no trustline for asset' },
  TRANSACTION_REJECTED:   { code: 'TRANSACTION_REJECTED',   severity: 'terminal',      message: 'Horizon rejected the transaction' },
  NETWORK_TIMEOUT:        { code: 'NETWORK_TIMEOUT',        severity: 'retryable',     message: 'Horizon did not respond in time',      retryAfterMs: 5_000 },
  HORIZON_ERROR:          { code: 'HORIZON_ERROR',          severity: 'retryable',     message: 'Unexpected Horizon error',             retryAfterMs: 10_000 },
  INVALID_DESTINATION:    { code: 'INVALID_DESTINATION',    severity: 'terminal',      message: 'Destination address is malformed' },
  MEMO_TOO_LONG:          { code: 'MEMO_TOO_LONG',          severity: 'terminal',      message: 'Memo exceeds 28-byte limit' },
  FEE_TOO_LOW:            { code: 'FEE_TOO_LOW',            severity: 'retryable',     message: 'Base fee below network minimum',       retryAfterMs: 2_000 },
  ESCROW_LOCKED:          { code: 'ESCROW_LOCKED',          severity: 'manual_review', message: 'Escrow is locked pending dispute' },
  ESCROW_EXPIRED:         { code: 'ESCROW_EXPIRED',         severity: 'terminal',      message: 'Escrow window has expired' },
  BUDDY_DISPUTE_OPEN:     { code: 'BUDDY_DISPUTE_OPEN',     severity: 'manual_review', message: 'Queue buddy dispute is unresolved' },
  UNKNOWN:                { code: 'UNKNOWN',                severity: 'manual_review', message: 'Unclassified payout failure' },
};

export function classifyPayoutError(err: Error): PayoutFailureReason {
  const msg = err.message.toLowerCase();
  if (msg.includes('insufficient')) return PAYOUT_FAILURE_REASONS.INSUFFICIENT_BALANCE;
  if (msg.includes('no account'))   return PAYOUT_FAILURE_REASONS.ACCOUNT_NOT_FOUND;
  if (msg.includes('timeout'))      return PAYOUT_FAILURE_REASONS.NETWORK_TIMEOUT;
  if (msg.includes('fee'))          return PAYOUT_FAILURE_REASONS.FEE_TOO_LOW;
  return PAYOUT_FAILURE_REASONS.UNKNOWN;
}
