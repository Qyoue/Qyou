import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(72, 'Password must be at most 72 characters.'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const passwordSafetySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters.')
    .max(72, 'New password must be at most 72 characters.'),
});

export const accountSafetySchema = z.object({
  userId: z.string().min(1, 'User ID is required.'),
  action: z.enum(['lock', 'unlock', 'reset_failed_attempts']),
});

export const schemaEvolutionSchema = z.object({
  version: z.string().default('v1'),
  compatMode: z.boolean().default(true),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordSafetyInput = z.infer<typeof passwordSafetySchema>;
export type AccountSafetyInput = z.infer<typeof accountSafetySchema>;
export type SchemaEvolutionInput = z.infer<typeof schemaEvolutionSchema>;

