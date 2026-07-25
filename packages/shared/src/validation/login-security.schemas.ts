import { z } from 'zod';

export const deviceFingerprintSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required.'),
  userAgent: z.string().min(1, 'User agent string is required.'),
  ipAddress: z.string().ip().optional(),
  isKnownDevice: z.boolean().default(false),
});

export const secureLoginPayloadSchema = z.object({
  email: z.string().trim().toLowerCase().email('Valid email is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  device: deviceFingerprintSchema.optional(),
});

export type DeviceFingerprintInput = z.infer<typeof deviceFingerprintSchema>;
export type SecureLoginPayloadInput = z.infer<typeof secureLoginPayloadSchema>;
