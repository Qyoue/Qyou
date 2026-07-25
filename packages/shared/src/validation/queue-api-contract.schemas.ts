import { z } from 'zod';

export const queueErrorCodeSchema = z.enum([
  'QUEUE_NOT_FOUND',
  'QUEUE_FULL',
  'DUPLICATE_MEMBERSHIP',
  'UNAUTHORIZED_OPERATOR',
  'INVALID_PARAMS',
]);

export const queueErrorPayloadSchema = z.object({
  code: queueErrorCodeSchema,
  message: z.string().min(1, 'Error message is required.'),
  details: z.record(z.unknown()).optional(),
});

export const paginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type QueueErrorPayloadInput = z.infer<typeof queueErrorPayloadSchema>;
export type PaginationParamsInput = z.infer<typeof paginationParamsSchema>;
