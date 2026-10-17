import { z } from 'zod';

export const reportingSourceSchema = z.enum(['crowd_user', 'queue_operator', 'automated_sensor']);

export const realTimeWaitReportSchema = z.object({
  queueId: z.string().min(1, 'Queue ID is required.'),
  reportedWaitMinutes: z.number().int().min(0, 'Wait time cannot be negative.').max(480),
  source: reportingSourceSchema.default('crowd_user'),
});

export const waitTimeTrendSchema = z.object({
  queueId: z.string().min(1),
  averageWaitMinutes: z.number().min(0),
  reportsCount: z.number().int().min(0),
  trend: z.enum(['increasing', 'stable', 'decreasing']),
  confidenceScore: z.number().min(0).max(100),
});

export type RealTimeWaitReportInput = z.infer<typeof realTimeWaitReportSchema>;
export type WaitTimeTrendInput = z.infer<typeof waitTimeTrendSchema>;
