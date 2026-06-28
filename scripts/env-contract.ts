import { z } from 'zod';

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/qyou?schema=public'),
  JWT_SECRET: z.string().default('dev-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('1h'),
});

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
});

export const mobileEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;
export type MobileEnv = z.infer<typeof mobileEnvSchema>;

export interface EnvContract<T> {
  app: string;
  schema: z.ZodSchema<T>;
  envFile: string;
  requiredVars: string[];
  optionalWithDefault: string[];
}

export const contracts: EnvContract<unknown>[] = [
  {
    app: 'apps/api',
    schema: apiEnvSchema,
    envFile: 'apps/api/.env',
    requiredVars: [],
    optionalWithDefault: ['NODE_ENV', 'PORT', 'DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'],
  },
  {
    app: 'apps/web',
    schema: webEnvSchema,
    envFile: 'apps/web/.env.local',
    requiredVars: [],
    optionalWithDefault: ['NEXT_PUBLIC_API_URL'],
  },
  {
    app: 'apps/mobile',
    schema: mobileEnvSchema,
    envFile: 'apps/mobile/.env',
    requiredVars: [],
    optionalWithDefault: ['EXPO_PUBLIC_API_URL'],
  },
];

export function validateEnvFile(
  fileVars: Record<string, string>,
  contract: EnvContract<unknown>,
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const key of contract.requiredVars) {
    if (!(key in fileVars) || !fileVars[key]) {
      errors.push(`${contract.app}: missing required env var "${key}"`);
    }
  }

  for (const [key, value] of Object.entries(fileVars)) {
    if (
      contract.optionalWithDefault.includes(key) &&
      (value.includes('change-me') || value === '""')
    ) {
      warnings.push(`${contract.app}: "${key}" uses a placeholder value — replace in production`);
    }
  }

  for (const key of Object.keys(fileVars)) {
    const allKnown = [...contract.requiredVars, ...contract.optionalWithDefault];
    if (!allKnown.includes(key)) {
      warnings.push(`${contract.app}: "${key}" is not defined in the contract`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
