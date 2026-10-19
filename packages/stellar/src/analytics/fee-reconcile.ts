/**
 * Feed the fee tracker from confirmed transactions and reconcile against Horizon (#1131).
 * Standalone: `FeeSink` is satisfied by `TransactionFeeTracker` through a small adapter.
 */
export interface ConfirmedTx {
  hash: string;
  /** Horizon `fee_charged`, in stroops, as a string. */
  feeCharged: string;
  ledger: number;
  /** ISO timestamp from Horizon `created_at`. */
  createdAt: string;
}

export interface FeeSink {
  record(entry: { hash: string; feeStroops: bigint; ledger: number; at: Date }): void;
}

/** Record each confirmed transaction exactly once, using Horizon's real charged fee. */
export function feedFeeTracker(sink: FeeSink, txs: ConfirmedTx[], seen: Set<string> = new Set()): number {
  let added = 0;
  for (const tx of txs) {
    if (seen.has(tx.hash)) continue;
    seen.add(tx.hash);
    sink.record({ hash: tx.hash, feeStroops: BigInt(tx.feeCharged), ledger: tx.ledger, at: new Date(tx.createdAt) });
    added += 1;
  }
  return added;
}

export interface FeeReconciliation {
  trackedStroops: bigint;
  horizonStroops: bigint;
  differenceStroops: bigint;
  missingFromTracker: string[];
  unknownToHorizon: string[];
  matches: boolean;
}

/** Compare cumulative tracked fees with the fees Horizon reports for the same transactions. */
export function reconcileFees(tracked: Map<string, bigint>, horizon: ConfirmedTx[]): FeeReconciliation {
  const horizonMap = new Map(horizon.map((t) => [t.hash, BigInt(t.feeCharged)] as const));
  let trackedTotal = 0n;
  let horizonTotal = 0n;
  const missing: string[] = [];
  const unknown: string[] = [];
  for (const [hash, fee] of tracked) {
    trackedTotal += fee;
    if (!horizonMap.has(hash)) unknown.push(hash);
  }
  for (const [hash, fee] of horizonMap) {
    horizonTotal += fee;
    if (!tracked.has(hash)) missing.push(hash);
  }
  return {
    trackedStroops: trackedTotal,
    horizonStroops: horizonTotal,
    differenceStroops: trackedTotal - horizonTotal,
    missingFromTracker: missing,
    unknownToHorizon: unknown,
    matches: trackedTotal === horizonTotal && !missing.length && !unknown.length,
  };
}
