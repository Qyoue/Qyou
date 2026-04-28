import 'dotenv/config';
import { STELLAR_CONFIG } from './config';

/** Roles a settlement account can play in the Qyou treasury */
export type SettlementAccountRole = 'TREASURY' | 'ESCROW' | 'FEE_COLLECTOR';

/** Configuration model for a Stellar settlement account */
export interface SettlementAccount {
  publicKey: string;
  role: SettlementAccountRole;
  label: string;
  network: typeof STELLAR_CONFIG.network;
  isActive: boolean;
}

/** Validates that a Stellar public key has the expected G… format */
function isValidPublicKey(key: string): boolean {
  return /^G[A-Z2-7]{55}$/.test(key);
}

/** Builds a SettlementAccount from environment variables */
export function loadSettlementAccount(
  role: SettlementAccountRole,
): SettlementAccount {
  const envKey = `STELLAR_${role}_PUBLIC_KEY`;
  const publicKey = process.env[envKey] ?? '';

  if (!publicKey) {
    console.warn(`⚠️  ${envKey} is not set — settlement account inactive`);
  } else if (!isValidPublicKey(publicKey)) {
    throw new Error(`Invalid Stellar public key for role ${role}: ${publicKey}`);
  }

  return {
    publicKey,
    role,
    label: `Qyou ${role.charAt(0) + role.slice(1).toLowerCase()} Account`,
    network: STELLAR_CONFIG.network,
    isActive: isValidPublicKey(publicKey),
  };
}

/** Pre-loaded settlement accounts for the running environment */
export const SETTLEMENT_ACCOUNTS: Record<SettlementAccountRole, SettlementAccount> = {
  TREASURY: loadSettlementAccount('TREASURY'),
  ESCROW: loadSettlementAccount('ESCROW'),
  FEE_COLLECTOR: loadSettlementAccount('FEE_COLLECTOR'),
};
