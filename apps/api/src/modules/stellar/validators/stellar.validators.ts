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

export type LinkWalletInputType = z.infer<typeof linkWalletSchema>;
export type UnlinkWalletInputType = z.infer<typeof unlinkWalletSchema>;
