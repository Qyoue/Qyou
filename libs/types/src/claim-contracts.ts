/**
 * Contract types for the reward claim flow.
 * Defines the request shape sent to the backend and the result shape
 * returned after Stellar settlement, keeping the on-chain adapter decoupled
 * from live app state.
 */

/** Payload the client sends when initiating a reward claim */
export interface ClaimRequest {
  userId: string;
  /** Amount in XLM stroops (1 XLM = 10_000_000 stroops) */
  amountStroops: number;
  /** Destination Stellar public key for the payout */
  destinationPublicKey: string;
  /** Optional idempotency key to prevent duplicate submissions */
  idempotencyKey?: string;
}

/** Outcome returned after the claim is processed */
export interface ClaimResult {
  claimId: string;
  userId: string;
  amountStroops: number;
  status: ClaimResultStatus;
  /** Stellar transaction hash, present when status is SETTLED */
  txHash?: string;
  /** ISO timestamp of when the claim was finalised */
  settledAt?: string;
  /** Human-readable reason for FAILED or REJECTED outcomes */
  failureReason?: string;
}

export type ClaimResultStatus = 'SETTLED' | 'PENDING' | 'FAILED' | 'REJECTED';

/** Validates a ClaimRequest before it is forwarded to the Stellar adapter */
export function validateClaimRequest(req: ClaimRequest): string[] {
  const errors: string[] = [];

  if (!req.userId?.trim()) errors.push('userId is required');
  if (!Number.isInteger(req.amountStroops) || req.amountStroops <= 0)
    errors.push('amountStroops must be a positive integer');
  if (!/^G[A-Z2-7]{55}$/.test(req.destinationPublicKey))
    errors.push('destinationPublicKey is not a valid Stellar public key');

  return errors;
}
