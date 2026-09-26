import {
  InvalidPublicKeyError,
  WalletAlreadyLinkedError,
  WalletNotFoundError,
} from '../errors/stellar-error.js';

export interface WalletAccount {
  readonly userId: string;
  readonly publicKey: string;
  readonly createdAt: number;
}

export interface AccountBalance {
  readonly asset: string;
  readonly balance: string;
  readonly isNative: boolean;
}

export interface WalletBalances {
  readonly publicKey: string;
  readonly xlm: string;
  readonly balances: readonly AccountBalance[];
  readonly fetchedAt: number;
  readonly fromCache: boolean;
}

export interface WalletServiceOptions {
  readonly cacheTtlMs?: number;
  readonly balanceProvider?: (publicKey: string) => Promise<{ xlm: string; balances: AccountBalance[] }>;
}

export class WalletService {
  private readonly _wallets = new Map<string, WalletAccount>();
  private readonly _balanceCache = new Map<string, { data: Omit<WalletBalances, 'fromCache'>; expiresAt: number }>();
  private readonly _cacheTtlMs: number;
  private readonly _balanceProvider?: (publicKey: string) => Promise<{ xlm: string; balances: AccountBalance[] }>;

  constructor(options: WalletServiceOptions = {}) {
    this._cacheTtlMs = options.cacheTtlMs ?? 30_000;
    this._balanceProvider = options.balanceProvider;
  }

  /**
   * Validates whether a string is a well-formed Stellar public key (Ed25519 StrKey starting with G, length 56).
   */
  public isValidPublicKey(publicKey: string): boolean {
    if (typeof publicKey !== 'string' || publicKey.length !== 56) {
      return false;
    }
    // Stellar public keys begin with 'G' and use RFC 4648 Base32 alphabet
    return /^G[A-Z2-7]{55}$/.test(publicKey);
  }

  /**
   * Links a Stellar public key to a user ID.
   * Throws InvalidPublicKeyError if malformed.
   * Throws WalletAlreadyLinkedError if the user already has a linked wallet.
   */
  public linkWallet(userId: string, publicKey: string): WalletAccount {
    if (!this.isValidPublicKey(publicKey)) {
      throw new InvalidPublicKeyError(`Invalid Stellar public key format: ${publicKey}`);
    }

    const existing = this._wallets.get(userId);
    if (existing) {
      throw new WalletAlreadyLinkedError(
        `User ${userId} already has a linked wallet: ${existing.publicKey}`,
      );
    }

    const account: WalletAccount = {
      userId,
      publicKey,
      createdAt: Date.now(),
    };
    this._wallets.set(userId, account);
    return account;
  }

  /**
   * Retrieves the linked wallet for a user ID, or null if none linked.
   */
  public getWallet(userId: string): WalletAccount | null {
    return this._wallets.get(userId) || null;
  }

  /**
   * Unlinks a user's wallet. Throws WalletNotFoundError if no wallet was linked.
   */
  public unlinkWallet(userId: string): { unlinked: boolean; previousAccount: WalletAccount } {
    const existing = this._wallets.get(userId);
    if (!existing) {
      throw new WalletNotFoundError(`No linked wallet found for user ${userId}`);
    }

    this._wallets.delete(userId);
    this.invalidateBalanceCache(existing.publicKey);
    return { unlinked: true, previousAccount: existing };
  }

  /**
   * Fetches account balances for a Stellar public key with short-TTL in-memory caching.
   */
  public async getBalances(publicKey: string, forceRefresh = false): Promise<WalletBalances> {
    if (!this.isValidPublicKey(publicKey)) {
      throw new InvalidPublicKeyError(`Invalid Stellar public key format: ${publicKey}`);
    }

    const now = Date.now();
    const cached = this._balanceCache.get(publicKey);

    if (!forceRefresh && cached && cached.expiresAt > now) {
      return {
        ...cached.data,
        fromCache: true,
      };
    }

    let result: { xlm: string; balances: AccountBalance[] };
    if (this._balanceProvider) {
      result = await this._balanceProvider(publicKey);
    } else {
      result = {
        xlm: '0.0000000',
        balances: [{ asset: 'native', balance: '0.0000000', isNative: true }],
      };
    }

    const balanceData = {
      publicKey,
      xlm: result.xlm,
      balances: result.balances,
      fetchedAt: now,
    };

    this._balanceCache.set(publicKey, {
      data: balanceData,
      expiresAt: now + this._cacheTtlMs,
    });

    return {
      ...balanceData,
      fromCache: false,
    };
  }

  /**
   * Invalidates cached balance data for a public key.
   */
  public invalidateBalanceCache(publicKey: string): void {
    this._balanceCache.delete(publicKey);
  }
}
