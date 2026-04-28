import { Keypair } from '@stellar/stellar-sdk';

export interface WalletData {
  publicKey: string;
  secret: string;
}

export type WalletResult =
  | { ok: true; wallet: WalletData }
  | { ok: false; error: string };

export function createRandomWallet(): WalletResult {
  try {
    const pair = Keypair.random();
    return {
      ok: true,
      wallet: { publicKey: pair.publicKey(), secret: pair.secret() },
    };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export function walletFromSecret(secret: string): WalletResult {
  if (!secret || typeof secret !== 'string') {
    return { ok: false, error: 'Secret must be a non-empty string.' };
  }
  try {
    const pair = Keypair.fromSecret(secret);
    return {
      ok: true,
      wallet: { publicKey: pair.publicKey(), secret: pair.secret() },
    };
  } catch {
    return { ok: false, error: 'Invalid Stellar secret key.' };
  }
}

export function assertWallet(result: WalletResult): WalletData {
  if (!result.ok) throw new Error(`Wallet error: ${result.error}`);
  return result.wallet;
}

export function isValidPublicKey(key: string): boolean {
  try {
    Keypair.fromPublicKey(key);
    return true;
  } catch {
    return false;
  }
}
