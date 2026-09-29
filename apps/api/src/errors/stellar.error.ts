// src/errors/stellar.error.ts
/**
 * Base error class for all Qyou Stellar and Soroban operations.
 */
export class StellarError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when network connectivity issues or Horizon/RPC timeouts occur.
 */
export class NetworkError extends StellarError {
  constructor(message: string, cause?: unknown) {
    super(message, 'NETWORK_ERROR', cause);
  }
}

/**
 * Thrown when an account lacks sufficient balance to cover transaction fees or transfers.
 */
export class InsufficientBalanceError extends StellarError {
  constructor(message: string, cause?: unknown) {
    super(message, 'INSUFFICIENT_BALANCE', cause);
  }
}

/**
 * Thrown when interacting with a non-existent or invalid Stellar account address.
 */
export class InvalidAccountError extends StellarError {
  constructor(message: string, cause?: unknown) {
    super(message, 'INVALID_ACCOUNT', cause);
  }
}

/**
 * Thrown when a transaction is rejected by the network or smart contract execution fails.
 */
export class TransactionFailedError extends StellarError {
  constructor(
    message: string,
    public readonly txResultCode?: string,
    cause?: unknown
  ) {
    super(message, 'TRANSACTION_FAILED', cause);
  }
}

/**
 * Thrown when a transaction sequence number mismatch or conflict occurs.
 */
export class SequenceError extends StellarError {
  constructor(message: string, cause?: unknown) {
    super(message, 'SEQUENCE_ERROR', cause);
  }
}