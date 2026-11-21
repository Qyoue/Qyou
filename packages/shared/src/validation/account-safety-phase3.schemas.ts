import { z } from 'zod';

export const emailVerificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required.'),
  newEmail: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  token: z.string().min(6, 'Verification token must be valid.'),
});

export const passwordStrengthAuditSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required.'),
  newPassword: z
    .string()
    .min(10, 'Password must be at least 10 characters long.')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter.')
    .regex(/[0-9]/, 'Password must contain a number.'),
});

export type EmailVerificationInput = z.infer<typeof emailVerificationSchema>;
export type PasswordStrengthAuditInput = z.infer<typeof passwordStrengthAuditSchema>;
