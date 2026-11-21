import { z } from 'zod';

export const sessionSyncMessageSchema = z.object({
  event: z.enum(['login', 'logout', 'token_refreshed']),
  timestamp: z.number().positive(),
  userId: z.string().optional(),
  tabId: z.string().min(1, 'Tab ID is required for cross-tab sync.'),
});

export const webAuthBoundarySchema = z.object({
  isSyncedAcrossTabs: z.boolean().default(true),
  activeTabsCount: z.number().int().min(1).default(1),
});

export type SessionSyncMessageInput = z.infer<typeof sessionSyncMessageSchema>;
export type WebAuthBoundaryInput = z.infer<typeof webAuthBoundarySchema>;
