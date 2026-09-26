/**
 * Account Outgoing Transaction Watcher & Anomaly Alerting (#1031)
 *
 * Monitors custodial and distribution accounts on Stellar for unexpected or unauthorized
 * outgoing transactions not initiated by IncentiveService.
 */

import { DistributionKillSwitch } from './kill-switch.js';

export interface ObservedTransaction {
  readonly id: string;
  readonly hash: string;
  readonly sourceAccount: string;
  readonly destination?: string;
  readonly amount?: string;
  readonly asset?: string;
  readonly memo?: string;
  readonly createdAt: number;
  readonly successful: boolean;
}

export interface UnexpectedTransactionAlert {
  readonly alertId: string;
  readonly txHash: string;
  readonly sourceAccount: string;
  readonly destination?: string;
  readonly amount?: string;
  readonly asset?: string;
  readonly timestamp: number;
  readonly severity: 'CRITICAL';
  readonly message: string;
}

export type TransactionAlertHandler = (alert: UnexpectedTransactionAlert) => void;

export interface AccountTransactionWatcherOptions {
  readonly distributionAccountId: string;
  readonly autoHaltKillSwitch?: DistributionKillSwitch;
  readonly onAlert?: TransactionAlertHandler;
  readonly knownAuthorizedHashes?: Iterable<string>;
}

export class AccountTransactionWatcher {
  private readonly _distributionAccountId: string;
  private readonly _authorizedHashes = new Set<string>();
  private readonly _alerts: UnexpectedTransactionAlert[] = [];
  private readonly _alertHandlers = new Set<TransactionAlertHandler>();
  private readonly _autoHaltKillSwitch?: DistributionKillSwitch;
  private _pollingTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: AccountTransactionWatcherOptions) {
    this._distributionAccountId = options.distributionAccountId;
    this._autoHaltKillSwitch = options.autoHaltKillSwitch;

    if (options.onAlert) {
      this._alertHandlers.add(options.onAlert);
    }

    if (options.knownAuthorizedHashes) {
      for (const hash of options.knownAuthorizedHashes) {
        this._authorizedHashes.add(hash.toLowerCase());
      }
    }
  }

  public get distributionAccountId(): string {
    return this._distributionAccountId;
  }

  /**
   * Registers a transaction hash as authorized by IncentiveService.
   */
  public registerAuthorizedTransaction(txHash: string): void {
    if (txHash) {
      this._authorizedHashes.add(txHash.toLowerCase());
    }
  }

  /**
   * Checks whether a transaction hash is marked as authorized.
   */
  public isAuthorized(txHash: string): boolean {
    return this._authorizedHashes.has(txHash.toLowerCase());
  }

  /**
   * Inspects an observed transaction. If it is an outgoing transaction from
   * the distribution account and was NOT authorized, generates an alert
   * and optionally trips the kill switch.
   */
  public processTransaction(tx: ObservedTransaction): UnexpectedTransactionAlert | null {
    // Only inspect transactions originating from the watched distribution account
    if (tx.sourceAccount !== this._distributionAccountId) {
      return null;
    }

    // If the transaction was registered as authorized by the service, ignore
    if (this.isAuthorized(tx.hash)) {
      return null;
    }

    // Unauthorized outgoing transaction detected!
    const alert: UnexpectedTransactionAlert = {
      alertId: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      txHash: tx.hash,
      sourceAccount: tx.sourceAccount,
      destination: tx.destination,
      amount: tx.amount,
      asset: tx.asset,
      timestamp: Date.now(),
      severity: 'CRITICAL',
      message: `Unauthorized outgoing transaction detected on distribution account ${tx.sourceAccount}: tx ${tx.hash}${
        tx.amount ? ` for ${tx.amount} ${tx.asset ?? 'XLM'}` : ''
      }${tx.destination ? ` to ${tx.destination}` : ''}`,
    };

    this._alerts.push(alert);
    this._emitAlert(alert);

    // If configured with auto-halt kill switch, trip the kill switch immediately
    if (this._autoHaltKillSwitch && !this._autoHaltKillSwitch.isHalted()) {
      this._autoHaltKillSwitch.haltSync(
        `Automated kill switch triggered by AccountTransactionWatcher: unexpected outgoing tx ${tx.hash}`,
        'AccountTransactionWatcher'
      );
    }

    return alert;
  }

  /**
   * Processes a batch of transactions and returns any generated alerts.
   */
  public processBatch(transactions: ObservedTransaction[]): UnexpectedTransactionAlert[] {
    const alerts: UnexpectedTransactionAlert[] = [];
    for (const tx of transactions) {
      const alert = this.processTransaction(tx);
      if (alert) {
        alerts.push(alert);
      }
    }
    return alerts;
  }

  /**
   * Subscribes a listener to unexpected transaction alerts.
   */
  public onAlert(handler: TransactionAlertHandler): () => void {
    this._alertHandlers.add(handler);
    return () => {
      this._alertHandlers.delete(handler);
    };
  }

  /**
   * Returns all recorded alerts.
   */
  public getAlerts(): UnexpectedTransactionAlert[] {
    return [...this._alerts];
  }

  /**
   * Clears recorded alerts.
   */
  public clearAlerts(): void {
    this._alerts.length = 0;
  }

  /**
   * Starts a polling loop with a custom transaction fetcher.
   */
  public startPolling(
    fetcher: () => Promise<ObservedTransaction[]>,
    intervalMs = 10_000
  ): void {
    this.stopPolling();
    this._pollingTimer = setInterval(async () => {
      try {
        const txs = await fetcher();
        this.processBatch(txs);
      } catch (err) {
        console.error('[AccountTransactionWatcher] Error during polling cycle:', err);
      }
    }, intervalMs);
  }

  /**
   * Stops the polling loop if active.
   */
  public stopPolling(): void {
    if (this._pollingTimer) {
      clearInterval(this._pollingTimer);
      this._pollingTimer = null;
    }
  }

  private _emitAlert(alert: UnexpectedTransactionAlert): void {
    for (const handler of this._alertHandlers) {
      try {
        handler(alert);
      } catch (err) {
        console.error('[AccountTransactionWatcher] Error in alert handler:', err);
      }
    }
  }
}
