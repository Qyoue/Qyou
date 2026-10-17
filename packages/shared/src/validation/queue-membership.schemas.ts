import { z } from 'zod';

export const queueMemberRoleSchema = z.enum(['member', 'vip', 'queue_buddy', 'operator']);

export const joinQueueSchema = z.object({
  queueId: z.string().min(1, 'Queue ID is required.'),
  userId: z.string().min(1, 'User ID is required.'),
  role: queueMemberRoleSchema.default('member'),
});

export const newQueueOptionsSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters long.').max(80),
  maxCapacity: z.number().int().positive().optional(),
  allowQueueBuddies: z.boolean().default(true),
});

export type JoinQueueInput = z.infer<typeof joinQueueSchema>;
export type NewQueueOptionsInput = z.infer<typeof newQueueOptionsSchema>;
