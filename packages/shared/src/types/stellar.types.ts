export interface WalletAccountDto {
  userId: string;
  publicKey: string;
  createdAt: number;
}

export interface AccountBalanceDto {
  asset: string;
  balance: string;
  isNative: boolean;
}

export interface WalletBalancesDto {
  publicKey: string;
  xlm: string;
  balances: AccountBalanceDto[];
  fetchedAt: number;
  fromCache?: boolean;
}

export interface LinkWalletRequestDto {
  publicKey: string;
}

export interface UnlinkWalletRequestDto {
  password?: string;
  reauthConfirmed?: boolean;
}

export interface WalletResponseDto {
  success: boolean;
  wallet: WalletAccountDto;
  balances?: WalletBalancesDto;
}

export interface UnlinkWalletResponseDto {
  success: boolean;
  message: string;
  unlinkedAt: number;
}

export type RewardStatusDto = 'pending' | 'confirmed' | 'failed';

export interface RewardRecordDto {
  id: string;
  userId: string;
  queueId: string;
  recipient: string;
  amount: string;
  asset: string;
  status: RewardStatusDto;
  transactionHash?: string;
  error?: string;
  createdAt: number;
  confirmedAt?: number;
}

export interface RewardHistoryResponseDto {
  success: boolean;
  rewards: RewardRecordDto[];
  totalClaimed: string;
}

export interface QueueIncentiveConfigDto {
  queueId: string;
  enabled: boolean;
  rewardAmount: string;
  asset: string;
  maxRewardsPerUser?: number;
}
