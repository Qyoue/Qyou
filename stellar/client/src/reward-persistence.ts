// Documents the persistence boundary of MockRewardService so local-dev
// consumers have clear expectations about data durability. Closes #236.
//
// PERSISTENCE CONTRACT
// ────────────────────
// MockRewardService stores all state in process memory (Map + Array).
// Data is NOT written to disk, a database, or the Stellar network.
// Every process restart produces a clean slate — balances and history
// are lost. This is intentional: the mock exists to let the rest of the
// app develop without a live Stellar account.
//
// Boundary diagram:
//
//   ┌─────────────────────────────────────────────────────┐
//   │  MockRewardService (in-memory)                      │
//   │  ┌──────────────┐   ┌──────────────────────────┐   │
//   │  │ balances Map │   │ history RewardTransaction[]│  │
//   │  └──────────────┘   └──────────────────────────┘   │
//   │          ↑ lives only for the lifetime of the process│
//   └─────────────────────────────────────────────────────┘
//          ✗ MongoDB    ✗ Stellar Horizon    ✗ disk

/** Describes what a persistence-aware reward store must expose. */
export interface IRewardStore {
  /** Returns current balance; resolves to 0 for unknown users. */
  getBalance(userId: string): Promise<number>;
  /** Appends a transaction and updates the running balance atomically. */
  recordTransaction(
    userId: string,
    delta: number,
    txId: string,
    memo?: string,
  ): Promise<void>;
  /** Returns all transactions for a user, newest first. */
  getHistory(userId: string): Promise<StoredRewardTx[]>;
}

export type StoredRewardTx = {
  txId: string;
  userId: string;
  delta: number;
  balanceAfter: number;
  memo?: string;
  recordedAt: number; // epoch ms
};

/** Signals that a mock-only operation was attempted in a production context. */
export class MockBoundaryViolationError extends Error {
  constructor(op: string) {
    super(`MockRewardService.${op} must not be called outside local-dev mode.`);
    this.name = 'MockBoundaryViolationError';
  }
}
