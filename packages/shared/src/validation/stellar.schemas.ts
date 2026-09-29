import { z } from 'zod';

export const linkWalletSchema = z.object({
  publicKey: z
    .string()
    .min(1, 'publicKey is required')
    .regex(/^G[A-Z2-7]{55}$/, 'publicKey must be a valid 56-character Stellar public key starting with G'),
});

export const unlinkWalletSchema = z
  .object({
    password: z.string().min(1, 'password is required').optional(),
    reauthConfirmed: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.password || data.reauthConfirmed), {
    message: 'Re-authentication required: must provide password or reauth confirmation',
  });

export const walletAccountSchema = z.object({
  userId: z.string().min(1),
  publicKey: z.string().regex(/^G[A-Z2-7]{55}$/),
  createdAt: z.number(),
});

export const accountBalanceSchema = z.object({
  asset: z.string().min(1),
  balance: z.string(),
  isNative: z.boolean(),
});

export const walletBalancesSchema = z.object({
  publicKey: z.string().regex(/^G[A-Z2-7]{55}$/),
  xlm: z.string(),
  balances: z.array(accountBalanceSchema),
  fetchedAt: z.number(),
  fromCache: z.boolean().optional(),
});

export const walletResponseSchema = z.object({
  success: z.boolean(),
  wallet: walletAccountSchema,
  balances: walletBalancesSchema.optional(),
});

export const unlinkWalletResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  unlinkedAt: z.number(),
});

export const rewardRecordSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  queueId: z.string().min(1),
  recipient: z.string().regex(/^G[A-Z2-7]{55}$/),
  amount: z.string(),
  asset: z.string(),
  status: z.enum(['pending', 'confirmed', 'failed']),
  transactionHash: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.number(),
  confirmedAt: z.number().optional(),
});

export const rewardHistoryResponseSchema = z.object({
  success: z.boolean(),
  rewards: z.array(rewardRecordSchema),
  totalClaimed: z.string(),
});

export const queueIncentiveConfigSchema = z.object({
  queueId: z.string().min(1),
  enabled: z.boolean(),
  rewardAmount: z.string(),
  asset: z.string(),
  maxRewardsPerUser: z.number().optional(),
});
