// src/config/env.ts
import { z } from 'zod';

/**
 * Zod schema for Stellar and service configuration environment variables.
 * Ensures fail-fast validation at application boot time.
 */
export const envSchema = z.object({
  STELLAR_NETWORK: z.enum(['PUBLIC', 'TESTNET', 'FUTURENET']).default('TESTNET'),
  STELLAR_HORIZON_URL: z.string().url({ message: 'STELLAR_HORIZON_URL must be a valid HTTP/HTTPS URL' }),
  STELLAR_RPC_URL: z.string().url({ message: 'STELLAR_RPC_URL must be a valid HTTP/HTTPS URL' }).optional(),
  STELLAR_NETWORK_PASSPHRASE: z.string().min(1, { message: 'STELLAR_NETWORK_PASSPHRASE is required' }),
  SERVICE_ACCOUNT_SECRET: z.string().min(32, { message: 'SERVICE_ACCOUNT_SECRET must be at least 32 characters long' }),
  PORT: z.string().regex(/^\d+$/, { message: 'PORT must be a valid integer' }).default('3000'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates process.env against the envSchema and returns the parsed configuration.
 * Throws a detailed validation error and terminates startup if misconfigured.
 */
export function validateEnv(config: Record<string, unknown> = process.env): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formattedErrors = result.error.format();
    console.error('❌ Invalid or missing environment variables at startup:');
    console.error(JSON.stringify(formattedErrors, null, 2));
    throw new Error('Application startup failed due to invalid environment configuration.');
  }

  return result.data;
}

// Singleton export of validated environment configuration evaluated at boot
export const env = validateEnv();