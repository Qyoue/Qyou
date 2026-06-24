import { z } from 'zod';

/** Stellar public keys are 55–56 character base32 strings starting with G. */
const stellarAddressRegex = /^G[A-Z2-7]{54,55}$/;

export const initiateWalletLinkSchema = z.object({
  userId: z.string().min(1, 'userId is required.'),
  stellarAddress: z
    .string()
    .regex(stellarAddressRegex, 'Enter a valid Stellar public key (G… address).'),
});

export type InitiateWalletLinkInput = z.infer<typeof initiateWalletLinkSchema>;
