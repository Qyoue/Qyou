import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z
    .string()
    .min(1, 'JWT_SECRET is required')
    .refine((val) => process.env.NODE_ENV !== 'production' || val.length >= 32, {
      message: 'JWT_SECRET must be at least 32 characters in production',
    }),
  JWT_EXPIRES_IN: z.string().default('1h'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(12).default(12),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((val) => val.split(',').map((s) => s.trim())),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_REGISTER_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_DEFAULT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  EMAIL_ACTION_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(3),
  EMAIL_ACTION_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  WEB_BASE_URL: z.string().url().default('http://localhost:3000'),
  MAILER_MODE: z.enum(['auto', 'console', 'smtp']).default('auto'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().trim().min(1).optional(),
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  BODY_LIMIT: z.string().default('100kb'),
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
