import { z } from 'zod';

export const queueCategorySchema = z.enum(['bank', 'hospital', 'fuel_station', 'service_center', 'other']);

export const queueFilterSchema = z.object({
  category: queueCategorySchema.optional(),
  maxDistanceKm: z.number().positive().max(100).optional(),
  maxWaitTimeMinutes: z.number().positive().optional(),
  searchQuery: z.string().trim().max(100).optional(),
});

export const createQueueSchema = z.object({
  name: z.string().trim().min(3, 'Name must be at least 3 characters long.').max(100),
  category: queueCategorySchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type QueueFilterInput = z.infer<typeof queueFilterSchema>;
export type CreateQueueInput = z.infer<typeof createQueueSchema>;
