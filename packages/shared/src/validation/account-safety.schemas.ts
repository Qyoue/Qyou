import { z } from 'zod';

export const emailChangeSchema = z.object({
  newEmail: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  currentPassword: z.string().min(1, 'Password confirmation is required.'),
});

export const accountUnlockSchema = z.object({
  unlockCode: z.string().length(6, 'Unlock code must be exactly 6 characters.'),
});

export type EmailChangeSchemaInput = z.infer<typeof emailChangeSchema>;
export type AccountUnlockSchemaInput = z.infer<typeof accountUnlockSchema>;
