import { z } from 'zod';

export const persistedStateSchema = z.object({
  token: z.string().min(1, 'Token cannot be empty.'),
  userId: z.string().min(1, 'User ID is required.'),
  savedAt: z.number().positive(),
  expiresAt: z.number().positive(),
  mechanism: z.enum(['localStorage', 'sessionStorage', 'memory']),
});

export const restoreSessionSchema = z.object({
  sessionKey: z.string().min(1, 'Session key is required.'),
  autoRefresh: z.boolean().default(true),
});

export type PersistedStateInput = z.infer<typeof persistedStateSchema>;
export type RestoreSessionInput = z.infer<typeof restoreSessionSchema>;
