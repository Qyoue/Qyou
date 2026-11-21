/**
 * Public key ownership verification and account existence checks for Stellar wallets.
 */
import { Horizon, Keypair } from '@stellar/stellar-sdk';

export class WalletVerificationService {
  /**
   * Verifies digital signature to prove ownership of a Stellar public key.
   */
  public verifyKeyOwnership(publicKey: string, challengeMessage: string, signature: string): boolean {
    if (!publicKey || !signature) {
      return false;
    }
    try {
      return Keypair.fromPublicKey(publicKey).verify(Buffer.from(challengeMessage), Buffer.from(signature, 'base64'));
    } catch {
      return false;
    }
  }
}

export type AccountLoader = (publicKey: string) => Promise<unknown>;

export class AccountExistenceChecker {
  private existingAccounts = new Set<string>();
  private cache = new Map<string, { exists: boolean; expiresAt: number }>();

  constructor(
    private loadAccount: AccountLoader = (key) => new Horizon.Server(process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org').loadAccount(key),
    private ttlMs = 30_000,
  ) {}

  public registerAccount(publicKey: string): void {
    this.existingAccounts.add(publicKey);
  }

  /** Throws on network failure so an outage never reads as "exists". */
  public async checkAccountExists(publicKey: string): Promise<boolean> {
    if (this.existingAccounts.has(publicKey)) return true;
    const cached = this.cache.get(publicKey);
    if (cached && cached.expiresAt > Date.now()) return cached.exists;
    let exists: boolean;
    try {
      await this.loadAccount(publicKey);
      exists = true;
    } catch (err) {
      const status = (err as { response?: { status?: number }; status?: number })?.response?.status ?? (err as { status?: number })?.status;
      if (status !== 404) throw err;
      exists = false;
    }
    this.cache.set(publicKey, { exists, expiresAt: Date.now() + this.ttlMs });
    return exists;
  }
}
