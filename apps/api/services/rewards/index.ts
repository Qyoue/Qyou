import { LocalRewardService } from './localRewardService';
import { RewardService } from './types';

let rewardService: RewardService | null = null;

export const getRewardService = (): RewardService => {
  if (!rewardService) {
    rewardService = new LocalRewardService();
  }

  return rewardService;
};

export * from './types';
