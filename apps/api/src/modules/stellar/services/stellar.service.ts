import { WalletService } from '@qyou/stellar';
import type { RewardRecord, WalletAccount, WalletBalances } from '@qyou/stellar';
import type { StellarRepository } from '../repositories/stellar.repository.js';
import type {
  LinkWalletInput,
  UnlinkWalletInput,
  WalletDetailsResponse,
  UnlinkWalletResponse,
  StellarAuditLogEntry,
} from '../types/stellar.types.js';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../../shared/errors/index.js';
import { logger } from '../../../shared/logger/index.js';

/** Anything that can list a user's rewards (the incentive service, or a database-backed store). */
export interface RewardSource {
  getUserRewards(userId: string): RewardRecord[] | Promise<RewardRecord[]>;
}

export interface RewardHistoryPage {
  rewards: RewardHistoryItem[];
  nextCursor: string | null;
}

export interface RewardHistoryItem {
  id: string;
  queueId: string;
  amount: string;
  asset: string;
  status: string;
  transactionHash?: string;
  createdAt: string;
  confirmedAt?: string;
}

export class StellarApiService {
  private readonly _repository: StellarRepository;
  private readonly _walletService: WalletService;

  private readonly _rewardSource?: RewardSource;

  constructor(repository: StellarRepository, walletService?: WalletService, rewardSource?: RewardSource) {
    this._rewardSource = rewardSource;
    this._repository = repository;
    this._walletService = walletService ?? new WalletService();
  }

  public async linkWallet(userId: string, input: LinkWalletInput): Promise<WalletAccount> {
    if (!input.publicKey || !this._walletService.isValidPublicKey(input.publicKey)) {
      throw new ValidationError(
        'Invalid Stellar public key: must be a 56-character string starting with G.',
      );
    }

    const existingUserWallet = await this._repository.getWalletByUserId(userId);
    if (existingUserWallet) {
      throw new ConflictError(
        `User already has a linked Stellar wallet: ${existingUserWallet.publicKey}`,
      );
    }

    const existingKeyWallet = await this._repository.getWalletByPublicKey(input.publicKey);
    if (existingKeyWallet) {
      throw new ConflictError(
        `Stellar public key ${input.publicKey} is already linked to another account.`,
      );
    }

    const account: WalletAccount = {
      userId,
      publicKey: input.publicKey,
      createdAt: Date.now(),
    };

    // Keep memory cache in sync
    try {
      this._walletService.linkWallet(userId, input.publicKey);
    } catch {
      // If already in wallet service map, ignore
    }

    await this._repository.saveWallet(account);

    await this._repository.recordAuditLog({
      event: 'STELLAR_WALLET_LINKED',
      userId,
      details: { publicKey: input.publicKey },
      timestamp: Date.now(),
    });

    logger.info(`[stellar] Linked wallet ${input.publicKey} to user ${userId}`);
    return account;
  }

  public async getWalletDetails(userId: string): Promise<WalletDetailsResponse> {
    const wallet = await this._repository.getWalletByUserId(userId);
    if (!wallet) {
      throw new NotFoundError(`No linked Stellar wallet found for user ${userId}.`);
    }

    const balances = await this._walletService.getBalances(wallet.publicKey);

    return {
      wallet,
      balances,
    };
  }

  public async unlinkWallet(
    userId: string,
    input: UnlinkWalletInput,
  ): Promise<UnlinkWalletResponse> {
    if (!input.password && !input.reauthConfirmed) {
      throw new UnauthorizedError(
        'Re-authentication required: must provide password or verified confirmation to unlink wallet.',
      );
    }

    const wallet = await this._repository.getWalletByUserId(userId);
    if (!wallet) {
      throw new NotFoundError(`No linked Stellar wallet found for user ${userId}.`);
    }

    await this._repository.deleteWallet(userId);
    try {
      this._walletService.unlinkWallet(userId);
    } catch {
      // Ignored if missing in memory cache
    }

    const timestamp = Date.now();

    await this._repository.recordAuditLog({
      event: 'STELLAR_WALLET_UNLINKED',
      userId,
      details: { previousPublicKey: wallet.publicKey, unlinkedAt: timestamp },
      timestamp,
    });

    logger.info(
      `[stellar-audit] STELLAR_WALLET_UNLINKED: user=${userId} publicKey=${wallet.publicKey} timestamp=${timestamp}`,
    );

    return {
      success: true,
      message: 'Stellar wallet unlinked successfully.',
      unlinkedAt: timestamp,
    };
  }

  public async getAuditLogs(userId?: string): Promise<StellarAuditLogEntry[]> {
    return this._repository.getAuditLogs(userId);
  }

  /**
   * The caller's reward history, newest first, as an offset-cursor page. Only the
   * caller's own rewards are ever returned; internal fields (recipient address,
   * error details) are not exposed.
   */
  public async getRewardHistory(
    userId: string,
    opts: { limit: number; cursor?: number },
  ): Promise<RewardHistoryPage> {
    const all = this._rewardSource ? await this._rewardSource.getUserRewards(userId) : [];
    const mine = all.filter((r) => r.userId === userId).sort((a, b) => b.createdAt - a.createdAt);
    const start = opts.cursor ?? 0;
    const slice = mine.slice(start, start + opts.limit);
    const next = start + opts.limit < mine.length ? String(start + opts.limit) : null;
    return {
      rewards: slice.map((r) => ({
        id: r.id,
        queueId: r.queueId,
        amount: r.amount,
        asset: r.asset,
        status: r.status,
        transactionHash: r.transactionHash,
        createdAt: new Date(r.createdAt).toISOString(),
        confirmedAt: r.confirmedAt ? new Date(r.confirmedAt).toISOString() : undefined,
      })),
      nextCursor: next,
    };
  }
}
