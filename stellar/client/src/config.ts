import 'dotenv/config';

export type NetworkType = 'TESTNET' | 'MAINNET';

interface StellarConfig {
  network: NetworkType;
  horizonUrl: string;
  isProduction: boolean;
  /** Minimum XLM balance required before a reward payout is attempted */
  minFundingThresholdXlm: number;
}

const networkEnv = (
  process.env.STELLAR_NETWORK || 'TESTNET'
).toUpperCase() as NetworkType;

const readPositiveNumber = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
};

const CONFIG_MAP: Record<NetworkType, Omit<StellarConfig, 'minFundingThresholdXlm'>> = {
  TESTNET: {
    network: 'TESTNET',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    isProduction: false,
  },
  MAINNET: {
    network: 'MAINNET',
    horizonUrl: 'https://horizon.stellar.org',
    isProduction: true,
  },
};

export const STELLAR_CONFIG: StellarConfig = {
  ...CONFIG_MAP[networkEnv] || CONFIG_MAP.TESTNET,
  minFundingThresholdXlm: readPositiveNumber(
    'STELLAR_MIN_FUNDING_THRESHOLD_XLM',
    networkEnv === 'MAINNET' ? 2 : 1,
  ),
};

if (STELLAR_CONFIG.isProduction) {
  console.warn('⚠️  WARNING: Qyou is running on STELLAR MAINNET (Real Money)');
} else {
  console.log('🧪 Qyou Stellar running on TESTNET');
}
