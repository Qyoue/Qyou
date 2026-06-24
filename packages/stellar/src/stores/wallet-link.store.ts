import type { WalletLinkRequest } from '../types/wallet-link.types.js';

export interface WalletLinkStore {
  /** Persist a new wallet-link request. */
  save(request: WalletLinkRequest): Promise<void>;
  /** Retrieve by request ID. */
  findById(id: string): Promise<WalletLinkRequest | null>;
  /** Find the most-recent pending request for a given user. */
  findPendingByUserId(userId: string): Promise<WalletLinkRequest | null>;
  /** Find the most-recent pending request for a given Stellar address. */
  findPendingByStellarAddress(stellarAddress: string): Promise<WalletLinkRequest | null>;
  /** Overwrite an existing record (status update, expiry, etc.). */
  update(request: WalletLinkRequest): Promise<void>;
}
