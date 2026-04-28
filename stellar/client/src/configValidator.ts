import { NetworkType } from './config';

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_NETWORKS: NetworkType[] = ['TESTNET', 'MAINNET'];

const REQUIRED_ENV_KEYS = ['STELLAR_NETWORK'] as const;

export function validateStellarEnv(): ConfigValidationResult {
  const errors: string[] = [];

  for (const key of REQUIRED_ENV_KEYS) {
    if (!process.env[key]) {
      errors.push(`Missing env var: ${key}`);
    }
  }

  const network = (process.env.STELLAR_NETWORK || '').toUpperCase() as NetworkType;
  if (network && !VALID_NETWORKS.includes(network)) {
    errors.push(`Invalid STELLAR_NETWORK "${network}". Must be TESTNET or MAINNET.`);
  }

  return { valid: errors.length === 0, errors };
}

export function assertValidStellarEnv(): void {
  const result = validateStellarEnv();
  if (!result.valid) {
    throw new Error(`Stellar config validation failed:\n${result.errors.join('\n')}`);
  }
}

export function readPositiveEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function resolveHorizonUrl(network: NetworkType): string {
  return network === 'MAINNET'
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org';
}
