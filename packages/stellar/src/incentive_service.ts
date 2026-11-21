/**
 * IncentiveService interface definition and in-memory WalletService mock for testing.
 */

export interface RewardRequest {
  userId: string;
  queueId: string;
  amount: bigint;
  assetCode: string;
}

export interface RewardResult {
  transactionId: string;
  userId: string;
  amount: bigint;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface IncentiveService {
  rewardUser(request: RewardRequest): Promise<RewardResult>;
  getRewardHistory(userId: string): Promise<RewardResult[]>;
}

export class MockWalletService {
  private wallets = new Map<string, string>(); // userId -> publicKey

  public async createWallet(userId: string): Promise<string> {
    const pubKey = `G${userId.toUpperCase().padEnd(55, '0')}`;
    this.wallets.set(userId, pubKey);
    return pubKey;
  }

  public async getPublicKey(userId: string): Promise<string | undefined> {
    return this.wallets.get(userId);
  }
}
