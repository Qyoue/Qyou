import { z } from 'zod';

export const queueModerationSchema = z.object({
  queueId: z.string().min(1, 'Queue ID is required.'),
  operatorId: z.string().min(1, 'Operator ID is required.'),
  action: z.enum(['pause', 'resume', 'flag', 'unflag', 'update_capacity']),
  reason: z.string().max(200).optional(),
});

export const capacityUpdateSchema = z.object({
  queueId: z.string().min(1),
  maxCapacity: z.number().int().positive('Max capacity must be positive.'),
});

export type QueueModerationInput = z.infer<typeof queueModerationSchema>;
export type CapacityUpdateInput = z.infer<typeof capacityUpdateSchema>;
