/**
 * Production wallet helpers.
 * No test utilities or Friendbot references here.
 */
import { Keypair } from '@stellar/stellar-sdk';

export interface WalletInfo {
  publicKey: string;
  secret: string;
  pair: Keypair;
}

export class WalletManager {
  static createRandom(): WalletInfo {
    const pair = Keypair.random();
    return { publicKey: pair.publicKey(), secret: pair.secret(), pair };
  }

  static fromSecret(secret: string): WalletInfo {
    try {
      const pair = Keypair.fromSecret(secret);
      return { publicKey: pair.publicKey(), secret: pair.secret(), pair };
    } catch {
      throw new Error('Invalid Stellar secret key.');
    }
  }
}

/**
 * Thin helper used by test utilities only.
 * Kept here so test-wallet.ts can import without pulling in Friendbot logic.
 */
export function createTestWallet(): WalletInfo {
  return WalletManager.createRandom();
}
