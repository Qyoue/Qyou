// src/interfaces/wallet.interface.ts
import { Keypair } from '@stellar/stellar-sdk';

export interface WalletBalance {
  assetCode: string;
  assetIssuer?: string;
  balance: string;
}

export interface IWalletService {
  createAccount(): Promise<{ publicKey: string; secretKey: string }>;
  getBalances(publicKey: string): Promise<WalletBalance[]>;
  fundTestnetAccount(publicKey: string): Promise<boolean>;
}