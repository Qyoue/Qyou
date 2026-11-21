import type { NetworkType } from '../security/network-guard.js';

export type StellarAccountId = string;

/**
 * Domain type for a Stellar account owned by a Qyou user, as defined in the
 * Stellar Wave account model. Wallets are non-custodial by default; `secretKey`
 * is populated only for legacy custodial accounts that predate the Vault/KMS
 * secrets-management migration and is never serialized to client responses.
 */
export interface StellarAccount {
  readonly id: StellarAccountId;
  /** The Qyou user this account is linked to. */
  readonly userId: string;
  /** Ed25519 StrKey public key beginning with 'G' (56 chars). */
  readonly publicKey: string;
  /** Custodial-only secret seed; null/undefined for non-custodial wallets. */
  readonly secretKey?: string;
  readonly network: NetworkType;
  readonly isCustodial: boolean;
  readonly linkedAt: number;
}