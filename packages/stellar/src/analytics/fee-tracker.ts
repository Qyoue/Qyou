/**
 * Stellar On-Chain Transaction Fee & Cost Tracker (#1070)
 *
 * Tracks, aggregates, and reports cumulative network transaction fees paid
 * by the distribution pool and operational accounts on the Stellar network.
 */

export interface TransactionFeeRecord {
  readonly txHash: string;
  readonly feeStroops: bigint;
  readonly feeXlm: string;
  readonly operationCount: number;
  readonly timestamp: number;
  readonly account?: string;
  readonly memo?: string;
}

export interface FeeSummaryReport {
  readonly totalTransactions: number;
  readonly totalFeeStroops: string;
  readonly totalFeeXlm: string;
  readonly averageFeePerTxStroops: number;
  readonly minFeeStroops: number;
  readonly maxFeeStroops: number;
  readonly lastTrackedAt: number | null;
}

export class TransactionFeeTracker {
  private static _instance: TransactionFeeTracker | null = null;

  private readonly _records: TransactionFeeRecord[] = [];
  private readonly _maxRecords = 1000;
  private _totalFeeStroops = 0n;
  private _minFeeStroops = Number.MAX_SAFE_INTEGER;
  private _maxFeeStroops = 0;
  private _lastTrackedAt: number | null = null;

  public static getInstance(): TransactionFeeTracker {
    if (!this._instance) {
      this._instance = new TransactionFeeTracker();
    }
    return this._instance;
  }

  public static resetInstance(): void {
    this._instance = null;
  }

  /**
   * Converts stroops (bigint) to formatted decimal XLM string (e.g. 100 stroops -> 0.0000100 XLM).
   */
  public static stroopsToXlm(stroops: bigint): string {
    const isNegative = stroops < 0n;
    const absVal = isNegative ? -stroops : stroops;
    const stroopStr = absVal.toString().padStart(8, '0');
    const whole = stroopStr.slice(0, -7) || '0';
    const fraction = stroopStr.slice(-7);
    const result = `${whole}.${fraction}`;
    return isNegative ? `-${result}` : result;
  }

  /**
   * Records a network transaction fee paid for an on-chain submission.
   */
  public recordFee(params: {
    txHash: string;
    feeStroops: bigint | number;
    operationCount?: number;
    account?: string;
    memo?: string;
    timestamp?: number;
  }): TransactionFeeRecord {
    const feeBig = BigInt(params.feeStroops);
    const feeNum = Number(feeBig);
    const timestamp = params.timestamp || Date.now();
    const feeXlm = TransactionFeeTracker.stroopsToXlm(feeBig);

    const record: TransactionFeeRecord = {
      txHash: params.txHash,
      feeStroops: feeBig,
      feeXlm,
      operationCount: params.operationCount || 1,
      timestamp,
      account: params.account,
      memo: params.memo,
    };

    this._records.push(record);
    if (this._records.length > this._maxRecords) {
      this._records.shift();
    }

    this._totalFeeStroops += feeBig;
    if (feeNum < this._minFeeStroops) {
      this._minFeeStroops = feeNum;
    }
    if (feeNum > this._maxFeeStroops) {
      this._maxFeeStroops = feeNum;
    }
    this._lastTrackedAt = timestamp;

    return record;
  }

  /**
   * Returns a high-level summary of aggregate fee expenditure.
   */
  public getSummary(): FeeSummaryReport {
    const count = this._records.length;
    const avg =
      count > 0 ? Number(this._totalFeeStroops / BigInt(count)) : 0;

    return {
      totalTransactions: count,
      totalFeeStroops: this._totalFeeStroops.toString(),
      totalFeeXlm: TransactionFeeTracker.stroopsToXlm(this._totalFeeStroops),
      averageFeePerTxStroops: avg,
      minFeeStroops: count > 0 ? this._minFeeStroops : 0,
      maxFeeStroops: count > 0 ? this._maxFeeStroops : 0,
      lastTrackedAt: this._lastTrackedAt,
    };
  }

  /**
   * Returns recent individual transaction fee records.
   */
  public getRecentRecords(limit = 50): readonly TransactionFeeRecord[] {
    return this._records.slice(-limit);
  }

  /**
   * Generates Prometheus metrics for cumulative transaction fees paid.
   */
  public toPrometheusFormat(): string {
    const summary = this.getSummary();
    const lines = [
      '# HELP stellar_network_fees_paid_stroops_total Total cumulative on-chain network fees paid in stroops.',
      '# TYPE stellar_network_fees_paid_stroops_total counter',
      `stellar_network_fees_paid_stroops_total ${summary.totalFeeStroops}`,
      '',
      '# HELP stellar_network_fees_paid_xlm_total Total cumulative on-chain network fees paid in XLM.',
      '# TYPE stellar_network_fees_paid_xlm_total counter',
      `stellar_network_fees_paid_xlm_total ${summary.totalFeeXlm}`,
      '',
      '# HELP stellar_network_fee_transactions_total Total number of fee-incurring transactions recorded.',
      '# TYPE stellar_network_fee_transactions_total counter',
      `stellar_network_fee_transactions_total ${summary.totalTransactions}`,
      '',
      '# HELP stellar_average_fee_per_tx_stroops Rolling average transaction fee paid in stroops.',
      '# TYPE stellar_average_fee_per_tx_stroops gauge',
      `stellar_average_fee_per_tx_stroops ${summary.averageFeePerTxStroops}`,
      '',
    ];

    return lines.join('\n');
  }

  /**
   * Resets all fee tracking state.
   */
  public clear(): void {
    this._records.length = 0;
    this._totalFeeStroops = 0n;
    this._minFeeStroops = Number.MAX_SAFE_INTEGER;
    this._maxFeeStroops = 0;
    this._lastTrackedAt = null;
  }
}
