import { z } from 'zod';

export const contractEvolutionHeaderSchema = z.object({
  contractVersion: z
    .string()
    .regex(/^v[0-9]+(\.[0-9]+)?$/, 'Contract version must follow semantic formatting (e.g. v1 or v1.0).'),
  clientBuildNumber: z.number().int().positive('Client build number must be a positive integer.'),
  strictValidation: z.boolean().default(true),
});

export const schemaMigrationCheckSchema = z.object({
  targetVersion: z.string().min(1, 'Target version is required.'),
  allowFallback: z.boolean().default(false),
});

export type ContractEvolutionHeaderInput = z.infer<typeof contractEvolutionHeaderSchema>;
export type SchemaMigrationCheckInput = z.infer<typeof schemaMigrationCheckSchema>;
