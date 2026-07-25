import { z } from 'zod';

export const storageHydrationSchema = z.object({
  status: z.enum(['uninitialized', 'hydrating', 'hydrated', 'error']),
  hasStoredSession: z.boolean(),
  hydratedAt: z.number().optional(),
  errorMessage: z.string().optional(),
});

export const storageOptionsSchema = z.object({
  enableEncryption: z.boolean().default(false),
  storagePrefix: z.string().default('qyou_auth_p4'),
  ttlSeconds: z.number().positive().default(86400),
});

export type StorageHydrationInput = z.infer<typeof storageHydrationSchema>;
export type StorageOptionsInput = z.infer<typeof storageOptionsSchema>;
