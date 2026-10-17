import { z } from 'zod';

export const rolloutConfigSchema = z.object({
  stage: z.enum(['canary', 'staged', 'general_availability']),
  canaryPercentage: z.number().min(0).max(100),
  enableCrossTabSync: z.boolean().default(true),
  enablePersistentStorage: z.boolean().default(true),
});

export const rolloutEvaluationSchema = z.object({
  userId: z.string().min(1, 'User ID is required for rollout evaluation.'),
  userHash: z.number().int(),
});

export type RolloutConfigInput = z.infer<typeof rolloutConfigSchema>;
export type RolloutEvaluationInput = z.infer<typeof rolloutEvaluationSchema>;
