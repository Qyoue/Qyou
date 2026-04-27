// Documents the reward service interface and the responsibilities of each
// package in the reward pipeline. Closes #235.
//
// PACKAGE RESPONSIBILITIES
// ────────────────────────
// libs/types          — shared contracts (RewardTransaction, IRewardService)
//                       No runtime logic; safe to import from any layer.
// stellar/client      — Stellar adapter: submits payouts to Horizon, maps
//                       Stellar responses back to shared contracts.
//                       Never imported by the mobile app directly.
// apps/api            — orchestrates reward logic; calls IRewardService;
//                       decides whether to use Mock or Stellar adapter.
//
// INTERFACE CONTRACT
// ──────────────────
// All reward adapters must satisfy IRewardService (defined in rewards.ts).
// The mock and the eventual Stellar-backed adapter are interchangeable.

import type { RewardTransaction } from './rewards';

/** Reason a reward operation was rejected before hitting the network. */
export type RewardOpRejectionReason =
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_AMOUNT'
  | 'USER_NOT_FOUND'
  | 'SERVICE_UNAVAILABLE';

/** Typed error thrown by any IRewardService implementation. */
export class RewardServiceError extends Error {
  constructor(
    public readonly reason: RewardOpRejectionReason,
    message: string,
  ) {
    super(message);
    this.name = 'RewardServiceError';
  }
}

/** Metadata returned alongside a transaction to aid tracing. */
export type RewardOpResult = {
  transaction: RewardTransaction;
  /** True when the operation was handled by the mock adapter. */
  isMock: boolean;
  /** Stellar tx hash when settled on-chain; null for mock. */
  stellarTxHash: string | null;
};

/**
 * Factory signature — the API layer calls this to obtain the active adapter.
 * Swap the return type between MockRewardService and StellarRewardService
 * without touching call-sites.
 */
export type RewardServiceFactory = () => import('./rewards').IRewardService;
