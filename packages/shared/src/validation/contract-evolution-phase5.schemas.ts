import { z } from 'zod';

export const phase5CompatibilitySchema = z.object({
  minimumSupportedVersion: z.string().default('v1.0'),
  activeVersion: z.string().min(1, 'Active contract version is required.'),
  experimentalFeatures: z.array(z.string()).default([]),
});

export const contractAssertionTokenSchema = z.object({
  token: z.string().min(10, 'Assertion token must be valid.'),
  issuedVersion: z.string().min(1),
  expiresTimestamp: z.number().positive(),
});

export type Phase5CompatibilityInput = z.infer<typeof phase5CompatibilitySchema>;
export type ContractAssertionTokenInput = z.infer<typeof contractAssertionTokenSchema>;
