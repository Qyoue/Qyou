/**
 * Soroban TTL extension job for the pool contract (#1366).
 *
 * A contract instance whose TTL runs out is archived and stops working. This job checks the
 * remaining ledgers and calls the contract's `extend_instance_ttl` when they fall below a
 * threshold. Ledger lookups and the extension call are injected, so it is testable offline.
 */
export interface TtlExtensionOptions {
  /** Remaining TTL, in ledgers, of the contract instance. */
  getRemainingLedgers: () => Promise<number>;
  /** Submits `extend_instance_ttl(threshold, extendTo)`; resolves to a transaction hash. */
  extend: (threshold: number, extendTo: number) => Promise<string>;
  /** Extend when fewer than this many ledgers remain. Default 17_280 (about 1 day). */
  thresholdLedgers?: number;
  /** Extend up to this many ledgers. Default 518_400 (about 30 days). */
  extendToLedgers?: number;
  onError?: (error: unknown) => void;
}

export type TtlCheckResult =
  | { action: 'none'; remaining: number }
  | { action: 'extended'; remaining: number; txHash: string }
  | { action: 'failed'; error: string };

export class TtlExtensionJob {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly threshold: number;
  private readonly extendTo: number;

  constructor(private readonly options: TtlExtensionOptions) {
    this.threshold = options.thresholdLedgers ?? 17_280;
    this.extendTo = options.extendToLedgers ?? 518_400;
    if (this.extendTo <= this.threshold) {
      throw new Error('extendToLedgers must be greater than thresholdLedgers');
    }
  }

  public async run(): Promise<TtlCheckResult> {
    try {
      const remaining = await this.options.getRemainingLedgers();
      if (remaining >= this.threshold) return { action: 'none', remaining };
      const txHash = await this.options.extend(this.threshold, this.extendTo);
      return { action: 'extended', remaining, txHash };
    } catch (error) {
      this.options.onError?.(error);
      return { action: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
  }

  /** Runs once now and then every `intervalMs` (default 6 hours). */
  public start(intervalMs: number = 6 * 60 * 60 * 1000): void {
    if (this.timer) return;
    void this.run();
    this.timer = setInterval(() => void this.run(), intervalMs);
    this.timer.unref?.();
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
