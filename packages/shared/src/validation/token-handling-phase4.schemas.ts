import { z } from 'zod';

export const slidingSessionSchema = z.object({
  slidingWindowMinutes: z.number().positive().default(30),
  absoluteMaxLifetimeHours: z.number().positive().default(24),
  renewBeforeExpirationSeconds: z.number().positive().default(300),
});

export const tokenRevocationSchema = z.object({
  jti: z.string().min(1, 'Token ID (jti) is required for revocation.'),
  reason: z.enum(['user_logout', 'security_revocation', 'password_change']),
});

export type SlidingSessionInput = z.infer<typeof slidingSessionSchema>;
export type TokenRevocationInput = z.infer<typeof tokenRevocationSchema>;
