import { MockRewardService } from '@qyou/stellar';
import { rewardLedgerRepository } from './repository';
import { RecordRewardInput, RewardService } from './types';

const mockRewardService = new MockRewardService();

export class LocalRewardService implements RewardService {
  async getBalance(userId: string) {
    return rewardLedgerRepository.getBalance(userId);
  }

  async getHistory(userId: string) {
    return rewardLedgerRepository.findHistory(userId);
  }

  async recordEntry(input: RecordRewardInput) {
    const entry = await rewardLedgerRepository.createEntry(input);

    if (entry.type === 'GRANT' && entry.status === 'CONFIRMED') {
      await mockRewardService.earn(entry.userId, entry.amount, entry.memo || entry.source);
    }

    if ((entry.type === 'DEBIT' || entry.type === 'CLAIM') && entry.status === 'CONFIRMED') {
      try {
        await mockRewardService.claim(entry.userId, Math.abs(entry.amount));
      } catch {
        // The local ledger remains source-of-truth even if the mock adapter has no prior balance state.
      }
    }

    return entry;
  }
}
