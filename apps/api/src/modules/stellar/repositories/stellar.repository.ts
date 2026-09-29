import type { WalletAccount } from '@qyou/stellar';
import type { StellarAuditLogEntry } from '../types/stellar.types.js';

export interface StellarRepository {
  getWalletByUserId(userId: string): Promise<WalletAccount | null>;
  getWalletByPublicKey(publicKey: string): Promise<WalletAccount | null>;
  saveWallet(account: WalletAccount): Promise<WalletAccount>;
  deleteWallet(userId: string): Promise<boolean>;
  recordAuditLog(entry: Omit<StellarAuditLogEntry, 'id'>): Promise<StellarAuditLogEntry>;
  getAuditLogs(userId?: string): Promise<StellarAuditLogEntry[]>;
}

export class InMemoryStellarRepository implements StellarRepository {
  private readonly _wallets = new Map<string, WalletAccount>();
  private readonly _auditLogs: StellarAuditLogEntry[] = [];

  public async getWalletByUserId(userId: string): Promise<WalletAccount | null> {
    return this._wallets.get(userId) || null;
  }

  public async getWalletByPublicKey(publicKey: string): Promise<WalletAccount | null> {
    for (const wallet of this._wallets.values()) {
      if (wallet.publicKey === publicKey) {
        return wallet;
      }
    }
    return null;
  }

  public async saveWallet(account: WalletAccount): Promise<WalletAccount> {
    this._wallets.set(account.userId, account);
    return account;
  }

  public async deleteWallet(userId: string): Promise<boolean> {
    return this._wallets.delete(userId);
  }

  public async recordAuditLog(entry: Omit<StellarAuditLogEntry, 'id'>): Promise<StellarAuditLogEntry> {
    const fullEntry: StellarAuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ...entry,
    };
    this._auditLogs.push(fullEntry);
    return fullEntry;
  }

  public async getAuditLogs(userId?: string): Promise<StellarAuditLogEntry[]> {
    if (!userId) {
      return [...this._auditLogs];
    }
    return this._auditLogs.filter((log) => log.userId === userId);
  }
}
