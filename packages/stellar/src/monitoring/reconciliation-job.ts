/**
 * Payment-Layer Reconciliation Job (#1065)
 *
 * Compares application database Reward records against on-chain transaction history.
 * Detects and flags any confirmed DB record missing from the ledger, unconfirmed DB records
 * that actually executed on-chain, and orphan ledger payouts.
 */

export interface DbRewardItem {
  readonly id: string;
  readonly userId: string;
  readonly queueId: string;
  readonly recipientWallet: string;
  readonly amount: string | bigint;
  readonly transactionHash?: string;
  readonly idempotencyKey?: string;
  readonly status: 'pending' | 'confirmed' | 'failed';
  readonly createdAt: number;
  readonly confirmedAt?: number;
}

export interface OnChainTransactionItem {
  readonly hash: string;
  readonly successful: boolean;
  readonly recipient?: string;
  readonly amountStroops?: bigint;
  readonly memo?: string;
  readonly ledgerSequence?: number;
  readonly timestamp: number;
}

export type DiscrepancyType =
  | 'missing_on_chain'
  | 'unconfirmed_in_db'
  | 'orphan_on_chain'
  | 'amount_mismatch'
  | 'failed_on_chain';

export interface ReconciliationDiscrepancy {
  readonly type: DiscrepancyType;
  readonly recordId?: string;
  readonly transactionHash?: string;
  readonly recipientWallet?: string;
  readonly details: string;
  readonly severity: 'warning' | 'critical';
  readonly detectedAt: number;
}

export interface ReconciliationRunReport {
  readonly runId: string;
  readonly totalDbRecords: number;
  readonly totalOnChainTxs: number;
  readonly matchedCount: number;
  readonly discrepancies: readonly ReconciliationDiscrepancy[];
  readonly status: 'clean' | 'discrepancies_found';
  readonly durationMs: number;
  readonly startedAt: number;
  readonly finishedAt: number;
}

export type DiscrepancyAlertHandler = (
  discrepancies: readonly ReconciliationDiscrepancy[],
  report: ReconciliationRunReport
) => void | Promise<void>;

export interface ReconciliationJobOptions {
  readonly dbProvider: () => Promise<readonly DbRewardItem[]>;
  readonly chainProvider: () => Promise<readonly OnChainTransactionItem[]>;
  readonly onDiscrepanciesFound?: DiscrepancyAlertHandler;
}

export class ReconciliationJob {
  private readonly _dbProvider: () => Promise<readonly DbRewardItem[]>;
  private readonly _chainProvider: () => Promise<readonly OnChainTransactionItem[]>;
  private readonly _alertHandlers = new Set<DiscrepancyAlertHandler>();
  private _lastReport: ReconciliationRunReport | null = null;
  private _timer: ReturnType<typeof setInterval> | null = null;

  constructor(options: ReconciliationJobOptions) {
    this._dbProvider = options.dbProvider;
    this._chainProvider = options.chainProvider;
    if (options.onDiscrepanciesFound) {
      this._alertHandlers.add(options.onDiscrepanciesFound);
    }
  }

  public subscribeAlert(handler: DiscrepancyAlertHandler): () => void {
    this._alertHandlers.add(handler);
    return () => {
      this._alertHandlers.delete(handler);
    };
  }

  /**
   * Executes a reconciliation cycle.
   */
  public async reconcile(): Promise<ReconciliationRunReport> {
    const startedAt = Date.now();
    const runId = `recon-run-${startedAt}-${Math.random().toString(36).substring(2, 7)}`;

    const [dbRecords, chainTxs] = await Promise.all([
      this._dbProvider(),
      this._chainProvider(),
    ]);

    const chainMap = new Map<string, OnChainTransactionItem>();
    for (const tx of chainTxs) {
      chainMap.set(tx.hash.toLowerCase(), tx);
    }

    const discrepancies: ReconciliationDiscrepancy[] = [];
    const processedTxHashes = new Set<string>();
    let matchedCount = 0;

    for (const record of dbRecords) {
      if (!record.transactionHash) {
        if (record.status === 'confirmed') {
          discrepancies.push({
            type: 'missing_on_chain',
            recordId: record.id,
            recipientWallet: record.recipientWallet,
            severity: 'critical',
            details: `Reward ${record.id} is marked 'confirmed' in DB but has no transaction hash associated.`,
            detectedAt: Date.now(),
          });
        }
        continue;
      }

      const txHashNorm = record.transactionHash.toLowerCase();
      const chainTx = chainMap.get(txHashNorm);

      if (!chainTx) {
        if (record.status === 'confirmed') {
          discrepancies.push({
            type: 'missing_on_chain',
            recordId: record.id,
            transactionHash: record.transactionHash,
            recipientWallet: record.recipientWallet,
            severity: 'critical',
            details: `Reward ${record.id} is marked 'confirmed' in DB with tx ${record.transactionHash}, but transaction was not found on-chain.`,
            detectedAt: Date.now(),
          });
        }
        continue;
      }

      processedTxHashes.add(txHashNorm);

      if (!chainTx.successful) {
        discrepancies.push({
          type: 'failed_on_chain',
          recordId: record.id,
          transactionHash: record.transactionHash,
          recipientWallet: record.recipientWallet,
          severity: 'critical',
          details: `Reward ${record.id} is marked '${record.status}' in DB, but on-chain transaction ${record.transactionHash} failed execution.`,
          detectedAt: Date.now(),
        });
        continue;
      }

      if (record.status !== 'confirmed') {
        discrepancies.push({
          type: 'unconfirmed_in_db',
          recordId: record.id,
          transactionHash: record.transactionHash,
          recipientWallet: record.recipientWallet,
          severity: 'warning',
          details: `Transaction ${record.transactionHash} confirmed on-chain, but DB record ${record.id} has status '${record.status}'.`,
          detectedAt: Date.now(),
        });
        continue;
      }

      // Check amount matching if chain amount is present
      if (chainTx.amountStroops !== undefined) {
        const expectedStroops = BigInt(record.amount);
        if (chainTx.amountStroops !== expectedStroops) {
          discrepancies.push({
            type: 'amount_mismatch',
            recordId: record.id,
            transactionHash: record.transactionHash,
            severity: 'critical',
            details: `Reward ${record.id} amount mismatch: DB expects ${expectedStroops} stroops, on-chain is ${chainTx.amountStroops} stroops.`,
            detectedAt: Date.now(),
          });
          continue;
        }
      }

      matchedCount++;
    }

    // Check for orphan on-chain transactions not recorded in DB
    for (const tx of chainTxs) {
      const txHashNorm = tx.hash.toLowerCase();
      if (!processedTxHashes.has(txHashNorm) && tx.successful) {
        discrepancies.push({
          type: 'orphan_on_chain',
          transactionHash: tx.hash,
          recipientWallet: tx.recipient,
          severity: 'critical',
          details: `On-chain reward transaction ${tx.hash} succeeded on ledger, but has no corresponding record in the database.`,
          detectedAt: Date.now(),
        });
      }
    }

    const finishedAt = Date.now();
    const report: ReconciliationRunReport = {
      runId,
      totalDbRecords: dbRecords.length,
      totalOnChainTxs: chainTxs.length,
      matchedCount,
      discrepancies,
      status: discrepancies.length === 0 ? 'clean' : 'discrepancies_found',
      durationMs: finishedAt - startedAt,
      startedAt,
      finishedAt,
    };

    this._lastReport = report;

    if (discrepancies.length > 0) {
      for (const handler of this._alertHandlers) {
        try {
          const res = handler(discrepancies, report);
          if (res instanceof Promise) {
            res.catch((err) => console.error('[ReconciliationJob] Alert handler error:', err));
          }
        } catch (err) {
          console.error('[ReconciliationJob] Alert handler exception:', err);
        }
      }
    }

    return report;
  }

  /**
   * Starts periodic scheduled execution of the reconciliation job.
   */
  public startScheduled(intervalMs = 300_000): void {
    if (this._timer) return;

    this.reconcile().catch((err) => {
      console.error('[ReconciliationJob] Initial run error:', err);
    });

    this._timer = setInterval(() => {
      this.reconcile().catch((err) => {
        console.error('[ReconciliationJob] Scheduled run error:', err);
      });
    }, intervalMs);

    if (this._timer && typeof this._timer.unref === 'function') {
      this._timer.unref();
    }
  }

  /**
   * Stops periodic scheduled execution.
   */
  public stopScheduled(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  public getLastReport(): ReconciliationRunReport | null {
    return this._lastReport;
  }
}
