import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z
    .string()
    .min(1, 'JWT_SECRET is required')
    .refine(
      (val) => process.env.NODE_ENV !== 'production' || val.length >= 32,
      { message: 'JWT_SECRET must be at least 32 characters in production' },
    ),
  JWT_EXPIRES_IN: z.string().default('1h'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((val) => val.split(',').map((s) => s.trim())),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const messages = result.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`[startup] Invalid environment configuration:\n${messages}`);
  process.exit(1);
}

export const env = result.data;
export type Env = typeof env;
