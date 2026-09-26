export interface WalletAccount {
  readonly userId: string;
  readonly publicKey: string;
  readonly createdAt: number;
}

export class WalletService {
  private readonly _wallets = new Map<string, WalletAccount>();

  public linkWallet(userId: string, publicKey: string): WalletAccount {
    const account: WalletAccount = {
      userId,
      publicKey,
      createdAt: Date.now(),
    };
    this._wallets.set(userId, account);
    return account;
  }

  public getWallet(userId: string): WalletAccount | null {
    return this._wallets.get(userId) || null;
  }

  public unlinkWallet(userId: string): boolean {
    return this._wallets.delete(userId);
  }
}
