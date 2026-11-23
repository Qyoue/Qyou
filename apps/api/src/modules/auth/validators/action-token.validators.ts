import { z } from 'zod';

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address.');
const tokenSchema = z.string().min(32).max(128);
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be at most 72 characters.')
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter.',
  )
  .refine((password) => /[0-9]/.test(password), 'Password must contain at least one number.');

export const emailActionRequestSchema = z.object({ email: emailSchema });
export const emailVerificationConfirmSchema = z.object({ token: tokenSchema });
export const passwordResetConfirmSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});
