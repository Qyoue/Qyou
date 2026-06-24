import type { WalletLinkRequest } from '../types/wallet-link.types.js';
import type { WalletLinkStore } from './wallet-link.store.js';

/**
 * In-memory implementation of {@link WalletLinkStore}.
 * For use in tests only — not thread-safe for production.
 */
export class InMemoryWalletLinkStore implements WalletLinkStore {
  private readonly records = new Map<string, WalletLinkRequest>();

  async save(request: WalletLinkRequest): Promise<void> {
    this.records.set(request.id, { ...request });
  }

  async findById(id: string): Promise<WalletLinkRequest | null> {
    return this.records.get(id) ?? null;
  }

  async findPendingByUserId(userId: string): Promise<WalletLinkRequest | null> {
    for (const r of this.records.values()) {
      if (r.userId === userId && r.status === 'pending') return { ...r };
    }
    return null;
  }

  async findPendingByStellarAddress(stellarAddress: string): Promise<WalletLinkRequest | null> {
    for (const r of this.records.values()) {
      if (r.stellarAddress === stellarAddress && r.status === 'pending') return { ...r };
    }
    return null;
  }

  async update(request: WalletLinkRequest): Promise<void> {
    if (!this.records.has(request.id)) {
      throw new Error(`WalletLinkRequest not found: ${request.id}`);
    }
    this.records.set(request.id, { ...request });
  }
}
