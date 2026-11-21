/**
 * Sequence management, channel accounts and fee bumps (#1128, #1129, #1130).
 * Design notes: packages/stellar/docs/adr-qyou-asset.md.
 */
import { TransactionBuilder } from '@stellar/stellar-sdk';

/** Serialises work per source account and reloads the sequence after `tx_bad_seq`. */
export class SequenceManager {
  private tail: Promise<unknown> = Promise.resolve();
  private sequence: bigint | null = null;

  constructor(private readonly loadSequence: () => Promise<string>) {}

  /** `build` receives the next sequence number; `submit` errors containing tx_bad_seq reload once. */
  run<T>(task: (sequence: string) => Promise<T>): Promise<T> {
    const next = this.tail.then(async () => {
      for (let attempt = 0; ; attempt++) {
        if (this.sequence === null) this.sequence = BigInt(await this.loadSequence());
        const seq = (this.sequence + 1n).toString();
        try {
          const result = await task(seq);
          this.sequence += 1n;
          return result;
        } catch (error) {
          if (attempt === 0 && String((error as Error)?.message ?? error).includes('tx_bad_seq')) {
            this.sequence = null; // reload from the network and try once more
            continue;
          }
          throw error;
        }
      }
    });
    this.tail = next.catch(() => undefined);
    return next;
  }
}

export interface ChannelAccount {
  publicKey: string;
  /** Balance in stroops, for health reporting. */
  balanceStroops: bigint;
}

/** Hands out one channel account per in-flight transaction. */
export class ChannelAccountPool {
  private free: ChannelAccount[];
  private waiters: Array<(account: ChannelAccount) => void> = [];

  constructor(private readonly accounts: ChannelAccount[], private readonly reserveStroops = 5_000_000n) {
    this.free = [...accounts];
  }

  async acquire(): Promise<ChannelAccount> {
    const account = this.free.pop();
    if (account) return account;
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  release(account: ChannelAccount): void {
    const waiter = this.waiters.shift();
    if (waiter) waiter(account);
    else this.free.push(account);
  }

  async with<T>(task: (account: ChannelAccount) => Promise<T>): Promise<T> {
    const account = await this.acquire();
    try {
      return await task(account);
    } finally {
      this.release(account);
    }
  }

  health() {
    return {
      total: this.accounts.length,
      free: this.free.length,
      lowBalance: this.accounts.filter((a) => a.balanceStroops < this.reserveStroops).map((a) => a.publicKey),
    };
  }
}

export interface FeeBumpOptions {
  /** Base fee per operation to bump to, in stroops. */
  baseFeeStroops: number;
  /** Configurable ceiling; bumping above it is refused. */
  maxBaseFeeStroops: number;
}

/** Wrap a stuck inner transaction in a fee bump paid by `feeSource` (the distributor). */
export function buildFeeBump(feeSource: unknown, innerTx: unknown, networkPassphrase: string, opts: FeeBumpOptions) {
  if (opts.baseFeeStroops > opts.maxBaseFeeStroops) {
    throw new Error(`Fee bump ${opts.baseFeeStroops} exceeds ceiling ${opts.maxBaseFeeStroops}`);
  }
  return TransactionBuilder.buildFeeBumpTransaction(
    feeSource as never,
    String(opts.baseFeeStroops),
    innerTx as never,
    networkPassphrase,
  );
}
