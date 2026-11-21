// src/errors/handler.ts
import {
  StellarError,
  NetworkError,
  InsufficientBalanceError,
  InvalidAccountError,
  TransactionFailedError,
  SequenceError,
} from './stellar.error';

/**
 * Intercepts Horizon and Soroban SDK execution errors at the package boundary
 * and re-throws them as typed, meaningful StellarError subclasses.
 */
export async function handleStellarCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (error instanceof StellarError) {
      throw error;
    }

    const message = error?.message || 'Unknown Stellar operation error';
    const responseData = error?.response?.data || error?.extras || {};
    const resultCode = responseData?.result_codes?.transaction || error?.resultCode;

    // Detect network / connectivity failures
    if (error.code === 'ETIMEDOUT' || error.name === 'FetchError' || !error.response) {
      throw new NetworkError(`Network connection failed: ${message}`, error);
    }

    // Detect insufficient balance error codes
    if (resultCode === 'tx_insufficient_balance' || message.includes('insufficient balance')) {
      throw new InsufficientBalanceError(`Insufficient balance: ${message}`, error);
    }

    // Detect sequence number conflicts
    if (resultCode === 'tx_bad_seq' || message.includes('bad sequence')) {
      throw new SequenceError(`Sequence number conflict: ${message}`, error);
    }

    // Detect missing account errors
    if (resultCode === 'tx_no_such_account' || message.includes('Account not found')) {
      throw new InvalidAccountError(`Invalid or non-existent account: ${message}`, error);
    }

    // Catch-all for other transaction failures and Horizon rejections
    if (resultCode || error.status >= 400) {
      throw new TransactionFailedError(
        `Stellar transaction execution failed: ${message}`,
        resultCode,
        error
      );
    }

    // Fallback for completely unexpected errors
    throw new StellarError(`Unexpected Stellar error: ${message}`, 'UNKNOWN_STELLAR_ERROR', error);
  }
}