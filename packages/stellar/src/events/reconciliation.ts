import { ParsedDistributionEvent } from './parser.js';

export interface DbRewardRecord {
  readonly id: string;
  readonly userId: string;
  readonly amount: string | number | bigint;
  readonly recipientWallet: string;
  readonly idempotencyKey: string;
  readonly status: 'pending' | 'confirmed' | 'failed';
}

export type ReconciliationStatus =
  | 'matched'
  | 'missing_on_chain'
  | 'amount_mismatch'
  | 'wallet_mismatch'
  | 'unexpected_on_chain';

export interface ReconciliationResultItem {
  readonly recordId?: string;
  readonly idempotencyKey: string;
  readonly status: ReconciliationStatus;
  readonly details: string;
  readonly dbAmount?: string;
  readonly chainAmount?: string;
}

export interface ReconciliationReport {
  readonly totalDbRecords: number;
  readonly totalOnChainEvents: number;
  readonly matchedCount: number;
  readonly discrepanciesCount: number;
  readonly items: readonly ReconciliationResultItem[];
  readonly timestamp: number;
}

/**
 * Reconciles application database reward records against on-chain Soroban distribution events.
 */
export function reconcileRewardDistributions(
  dbRewards: readonly DbRewardRecord[],
  onChainEvents: readonly ParsedDistributionEvent[]
): ReconciliationReport {
  const onChainMap = new Map<string, ParsedDistributionEvent>();
  for (const event of onChainEvents) {
    if (event.idempotencyKey) {
      onChainMap.set(event.idempotencyKey, event);
    }
  }

  const items: ReconciliationResultItem[] = [];
  let matchedCount = 0;
  let discrepanciesCount = 0;

  const processedChainKeys = new Set<string>();

  for (const dbRecord of dbRewards) {
    const chainEvent = onChainMap.get(dbRecord.idempotencyKey);

    if (!chainEvent) {
      if (dbRecord.status === 'confirmed') {
        discrepanciesCount++;
        items.push({
          recordId: dbRecord.id,
          idempotencyKey: dbRecord.idempotencyKey,
          status: 'missing_on_chain',
          details: 'DB record is marked confirmed but no matching on-chain distribution event was found',
        });
      } else {
        // Pending or failed record not yet on chain is expected
        items.push({
          recordId: dbRecord.id,
          idempotencyKey: dbRecord.idempotencyKey,
          status: 'matched',
          details: 'Pending record consistently absent from on-chain history',
        });
        matchedCount++;
      }
      continue;
    }

    processedChainKeys.add(dbRecord.idempotencyKey);
    const dbAmountBig = BigInt(dbRecord.amount);
    const chainAmountBig = chainEvent.amount;

    if (dbAmountBig !== chainAmountBig) {
      discrepanciesCount++;
      items.push({
        recordId: dbRecord.id,
        idempotencyKey: dbRecord.idempotencyKey,
        status: 'amount_mismatch',
        details: `Amount mismatch: DB=${dbAmountBig}, Chain=${chainAmountBig}`,
        dbAmount: dbAmountBig.toString(),
        chainAmount: chainAmountBig.toString(),
      });
      continue;
    }

    if (
      dbRecord.recipientWallet.trim().toUpperCase() !==
      chainEvent.recipient.trim().toUpperCase()
    ) {
      discrepanciesCount++;
      items.push({
        recordId: dbRecord.id,
        idempotencyKey: dbRecord.idempotencyKey,
        status: 'wallet_mismatch',
        details: `Recipient wallet mismatch: DB=${dbRecord.recipientWallet}, Chain=${chainEvent.recipient}`,
      });
      continue;
    }

    matchedCount++;
    items.push({
      recordId: dbRecord.id,
      idempotencyKey: dbRecord.idempotencyKey,
      status: 'matched',
      details: 'DB record and on-chain event match identically',
      dbAmount: dbAmountBig.toString(),
      chainAmount: chainAmountBig.toString(),
    });
  }

  // Check for orphan on-chain events with no matching DB record
  for (const event of onChainEvents) {
    if (!processedChainKeys.has(event.idempotencyKey)) {
      discrepanciesCount++;
      items.push({
        idempotencyKey: event.idempotencyKey,
        status: 'unexpected_on_chain',
        details: 'On-chain distribution exists with no corresponding DB record',
        chainAmount: event.amount.toString(),
      });
    }
  }

  return {
    totalDbRecords: dbRewards.length,
    totalOnChainEvents: onChainEvents.length,
    matchedCount,
    discrepanciesCount,
    items,
    timestamp: Date.now(),
  };
}
