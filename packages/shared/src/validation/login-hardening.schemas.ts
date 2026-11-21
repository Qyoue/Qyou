import { z } from 'zod';

export const hardenedRegistrationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address.')
    .refine((val) => !val.endsWith('@tempmail.com') && !val.endsWith('@mailinator.com'), {
      message: 'Disposable email addresses are not permitted.',
    }),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters long for enhanced security.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character.'),
  captchaToken: z.string().optional(),
});

export const hardenedLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  captchaToken: z.string().optional(),
});

export type HardenedRegistrationInput = z.infer<typeof hardenedRegistrationSchema>;
export type HardenedLoginInput = z.infer<typeof hardenedLoginSchema>;
