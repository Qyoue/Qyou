export type TransactionType = 'EARN' | 'SPEND' | 'CLAIM';
export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface RewardTransaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  timestamp: number;
  status: TransactionStatus;
  memo?: string;
}

export interface IRewardService {
  getBalance(userId: string): Promise<number>;

  earn(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<RewardTransaction>;

  claim(userId: string, amount: number): Promise<RewardTransaction>;

  getHistory(userId: string): Promise<RewardTransaction[]>;
}

export class MockRewardService implements IRewardService {
  private balances = new Map<string, number>();
  private history: RewardTransaction[] = [];

  constructor() {
    console.log(
      '⚠️ MockRewardService initialized. Data will reset on restart.',
    );
  }

  private async simulateDelay(ms = 800) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getBalance(userId: string): Promise<number> {
    await this.simulateDelay(200);
    return this.balances.get(userId) || 0;
  }

  async earn(
    userId: string,
    amount: number,
    reason: string,
  ): Promise<RewardTransaction> {
    await this.simulateDelay();

    const current = this.balances.get(userId) || 0;
    this.balances.set(userId, current + amount);

    const tx: RewardTransaction = {
      id: `mock-tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      amount,
      type: 'EARN',
      timestamp: Date.now(),
      status: 'CONFIRMED',
      memo: reason,
    };

    this.history.push(tx);
    return tx;
  }

  async claim(userId: string, amount: number): Promise<RewardTransaction> {
    await this.simulateDelay(1500);

    const current = this.balances.get(userId) || 0;

    if (current < amount) {
      throw new Error(
        `Insufficient funds. Available: ${current}, Requested: ${amount}`,
      );
    }

    this.balances.set(userId, current - amount);

    const tx: RewardTransaction = {
      id: `mock-claim-${Date.now()}`,
      userId,
      amount,
      type: 'CLAIM',
      timestamp: Date.now(),
      status: 'CONFIRMED',
      memo: 'Withdrawal to Wallet',
    };

    this.history.push(tx);
    return tx;
  }

  async getHistory(userId: string): Promise<RewardTransaction[]> {
    await this.simulateDelay(300);
    return this.history
      .filter((tx) => tx.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }
}
