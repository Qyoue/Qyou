/**
 * Concurrent payout submission (#1365).
 *
 * Each in-flight payout runs from its own channel account (`ChannelAccountPool`), and each
 * channel account has its own `SequenceManager`, so parallel payouts never reuse a sequence
 * number: sequence use is serialised per account and a `tx_bad_seq` triggers one reload.
 */
import { ChannelAccountPool, SequenceManager, type ChannelAccount } from './sequence-and-fees.js';

export interface PayoutSubmitterOptions {
  accounts: ChannelAccount[];
  /** Loads the current sequence number of a channel account from the network. */
  loadSequence: (publicKey: string) => Promise<string>;
}

export class PayoutSubmitter {
  private readonly pool: ChannelAccountPool;
  private readonly managers = new Map<string, SequenceManager>();

  constructor(private readonly options: PayoutSubmitterOptions) {
    this.pool = new ChannelAccountPool(options.accounts);
  }

  /** Runs `task` with a free channel account and the next sequence number for it. */
  submit<T>(task: (channel: ChannelAccount, sequence: string) => Promise<T>): Promise<T> {
    return this.pool.with((channel) => {
      let manager = this.managers.get(channel.publicKey);
      if (!manager) {
        manager = new SequenceManager(() => this.options.loadSequence(channel.publicKey));
        this.managers.set(channel.publicKey, manager);
      }
      return manager.run((sequence) => task(channel, sequence));
    });
  }

  health() {
    return this.pool.health();
  }
}
