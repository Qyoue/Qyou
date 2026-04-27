/** Idempotency-key strategy for Stellar submissions — issue #241
 *
 * Generates a deterministic key from (userId, kind, referenceId) so the same
 * logical operation is never submitted twice, even across retries.
 */

import crypto from 'crypto';

export type IdempotencyRecord = {
  key: string;
  txHash?: string;
  status: 'PENDING' | 'SUBMITTED' | 'FAILED';
  attempts: number;
  lastAttemptAt: string;
};

const store = new Map<string, IdempotencyRecord>();

/** Derive a stable key from the operation's logical identity. */
export function deriveIdempotencyKey(
  userId: string,
  kind: string,
  referenceId: string,
): string {
  return crypto
    .createHash('sha256')
    .update(`${userId}:${kind}:${referenceId}`)
    .digest('hex')
    .slice(0, 32);
}

/** Check whether a key has already been successfully submitted. */
export function isAlreadySubmitted(key: string): boolean {
  return store.get(key)?.status === 'SUBMITTED';
}

/** Record a submission attempt. */
export function recordAttempt(key: string, txHash?: string): IdempotencyRecord {
  const existing = store.get(key);
  const record: IdempotencyRecord = {
    key,
    txHash: txHash ?? existing?.txHash,
    status: txHash ? 'SUBMITTED' : 'PENDING',
    attempts: (existing?.attempts ?? 0) + 1,
    lastAttemptAt: new Date().toISOString(),
  };
  store.set(key, record);
  return record;
}

/** Mark a key as failed so it can be retried. */
export function markFailed(key: string): void {
  const rec = store.get(key);
  if (rec) store.set(key, { ...rec, status: 'FAILED' });
}
