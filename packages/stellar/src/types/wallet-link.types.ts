export type WalletLinkStatus = 'pending' | 'confirmed' | 'expired' | 'rejected';

export interface WalletLinkRequest {
  /** Unique ID for this link attempt. */
  id: string;
  /** Internal user ID requesting the link. */
  userId: string;
  /** Stellar public key (G… address). */
  stellarAddress: string;
  status: WalletLinkStatus;
  /** One-time challenge that must be signed to confirm the link. */
  challenge: string;
  /** UTC timestamp after which the request expires. */
  expiresAt: Date;
  createdAt: Date;
}

export interface InitiateWalletLinkInput {
  userId: string;
  stellarAddress: string;
}

export interface InitiateWalletLinkResult {
  requestId: string;
  challenge: string;
  expiresAt: Date;
}
