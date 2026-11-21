/**
 * Distribution Account Balance Monitor & Alert Service (#1063)
 *
 * Periodically monitors the Stellar distribution pool balance and alerts
 * administrators when available funds drop below configurable thresholds.
 */

export interface BalanceAlert {
  readonly id: string;
  readonly accountAddress: string;
  readonly currentBalanceXlm: number;
  readonly thresholdXlm: number;
  readonly severity: 'warning' | 'critical';
  readonly message: string;
  readonly timestamp: number;
}

export interface BalanceMonitorStatus {
  readonly accountAddress: string;
  readonly lastCheckedAt: number | null;
  readonly lastBalanceXlm: number | null;
  readonly warningThresholdXlm: number;
  readonly criticalThresholdXlm: number;
  readonly status: 'healthy' | 'warning' | 'critical' | 'uninitialized';
  readonly isRunning: boolean;
}

export type BalanceAlertHandler = (alert: BalanceAlert) => void | Promise<void>;

export interface BalanceMonitorOptions {
  readonly accountAddress: string;
  readonly warningThresholdXlm: number;
  readonly criticalThresholdXlm?: number;
  readonly balanceProvider: (account: string) => Promise<{ xlm: string | number }>;
  readonly onAlert?: BalanceAlertHandler;
}

export class DistributionBalanceMonitor {
  private readonly _accountAddress: string;
  private readonly _warningThresholdXlm: number;
  private readonly _criticalThresholdXlm: number;
  private readonly _balanceProvider: (account: string) => Promise<{ xlm: string | number }>;
  private readonly _alertHandlers = new Set<BalanceAlertHandler>();
  private readonly _alertHistory: BalanceAlert[] = [];
  private readonly _maxHistory = 100;

  private _timer: ReturnType<typeof setInterval> | null = null;
  private _lastCheckedAt: number | null = null;
  private _lastBalanceXlm: number | null = null;
  private _status: 'healthy' | 'warning' | 'critical' | 'uninitialized' = 'uninitialized';

  constructor(options: BalanceMonitorOptions) {
    if (!options.accountAddress || options.accountAddress.trim().length === 0) {
      throw new Error('accountAddress is required for DistributionBalanceMonitor');
    }
    if (options.warningThresholdXlm <= 0) {
      throw new Error('warningThresholdXlm must be greater than 0');
    }

    this._accountAddress = options.accountAddress;
    this._warningThresholdXlm = options.warningThresholdXlm;
    this._criticalThresholdXlm =
      options.criticalThresholdXlm ?? Math.max(1, Math.round(options.warningThresholdXlm * 0.25 * 100) / 100);
    this._balanceProvider = options.balanceProvider;

    if (options.onAlert) {
      this._alertHandlers.add(options.onAlert);
    }
  }

  public subscribeAlert(handler: BalanceAlertHandler): () => void {
    this._alertHandlers.add(handler);
    return () => {
      this._alertHandlers.delete(handler);
    };
  }

  /**
   * Executes an explicit balance check against configured thresholds.
   */
  public async checkBalance(): Promise<{
    currentBalanceXlm: number;
    alertTriggered: boolean;
    alert?: BalanceAlert;
  }> {
    const rawResult = await this._balanceProvider(this._accountAddress);
    const balanceNum =
      typeof rawResult.xlm === 'number' ? rawResult.xlm : parseFloat(rawResult.xlm);

    this._lastBalanceXlm = balanceNum;
    this._lastCheckedAt = Date.now();

    let alert: BalanceAlert | undefined;

    if (balanceNum <= this._criticalThresholdXlm) {
      this._status = 'critical';
      alert = {
        id: `alert-crit-${Date.now()}`,
        accountAddress: this._accountAddress,
        currentBalanceXlm: balanceNum,
        thresholdXlm: this._criticalThresholdXlm,
        severity: 'critical',
        message: `CRITICAL: Distribution account balance (${balanceNum} XLM) dropped below critical threshold (${this._criticalThresholdXlm} XLM). Payouts will imminently fail!`,
        timestamp: this._lastCheckedAt,
      };
    } else if (balanceNum <= this._warningThresholdXlm) {
      this._status = 'warning';
      alert = {
        id: `alert-warn-${Date.now()}`,
        accountAddress: this._accountAddress,
        currentBalanceXlm: balanceNum,
        thresholdXlm: this._warningThresholdXlm,
        severity: 'warning',
        message: `WARNING: Distribution account balance (${balanceNum} XLM) is below safe threshold (${this._warningThresholdXlm} XLM). Refill recommended.`,
        timestamp: this._lastCheckedAt,
      };
    } else {
      this._status = 'healthy';
    }

    if (alert) {
      this._alertHistory.unshift(alert);
      if (this._alertHistory.length > this._maxHistory) {
        this._alertHistory.pop();
      }

      for (const handler of this._alertHandlers) {
        try {
          const res = handler(alert);
          if (res instanceof Promise) {
            res.catch((err) => console.error('[BalanceMonitor] Alert handler rejected:', err));
          }
        } catch (err) {
          console.error('[BalanceMonitor] Alert handler error:', err);
        }
      }
    }

    return {
      currentBalanceXlm: balanceNum,
      alertTriggered: Boolean(alert),
      alert,
    };
  }

  /**
   * Starts periodic scheduled balance checking.
   */
  public startScheduled(intervalMs = 60_000): void {
    if (this._timer) {
      return;
    }

    // Run first check immediately
    this.checkBalance().catch((err) => {
      console.error('[BalanceMonitor] Scheduled initial check failed:', err);
    });

    this._timer = setInterval(() => {
      this.checkBalance().catch((err) => {
        console.error('[BalanceMonitor] Scheduled interval check failed:', err);
      });
    }, intervalMs);

    if (this._timer && typeof this._timer.unref === 'function') {
      this._timer.unref();
    }
  }

  /**
   * Stops periodic scheduled balance checking.
   */
  public stopScheduled(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  public getStatus(): BalanceMonitorStatus {
    return {
      accountAddress: this._accountAddress,
      lastCheckedAt: this._lastCheckedAt,
      lastBalanceXlm: this._lastBalanceXlm,
      warningThresholdXlm: this._warningThresholdXlm,
      criticalThresholdXlm: this._criticalThresholdXlm,
      status: this._status,
      isRunning: this._timer !== null,
    };
  }

  public getAlertHistory(): readonly BalanceAlert[] {
    return [...this._alertHistory];
  }

  public clearAlerts(): void {
    this._alertHistory.length = 0;
  }
}
