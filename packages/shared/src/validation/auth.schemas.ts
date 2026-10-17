import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password must be at most 72 characters.')
    // #829: actionable complexity messages safe to display to end users
    .refine((p) => /[A-Z]/.test(p), 'Password must contain at least one uppercase letter.')
    .refine((p) => /[0-9]/.test(p), 'Password must contain at least one number.'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const tokenRefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.'),
});

export const sessionValidationSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TokenRefreshSchemaInput = z.infer<typeof tokenRefreshSchema>;
export type SessionValidationInput = z.infer<typeof sessionValidationSchema>;

