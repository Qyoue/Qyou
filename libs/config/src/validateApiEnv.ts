import { assertEnv, required, isUrl, oneOf } from './validateEnv';

const API_ENV_SCHEMA = {
  API_PORT: [required],
  MONGO_URI: [required, isUrl],
  JWT_ACCESS_SECRET: [required],
  JWT_REFRESH_SECRET: [required],
  STELLAR_NETWORK: [required, oneOf('TESTNET', 'MAINNET')],
};

/**
 * Call once at API boot time. Throws with a descriptive message listing every
 * missing or invalid variable so the process fails fast before accepting traffic.
 */
export function validateApiEnv(env = process.env as Record<string, string | undefined>) {
  assertEnv(API_ENV_SCHEMA, env);
}
