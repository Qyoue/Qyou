import { IncentiveService, WalletService } from '@qyou/stellar';

/**
 * Factory for bootstrapping Stellar services within the API lifecycle.
 */
export function createStellarServices() {
  const walletService = new WalletService();
  const incentiveService = new IncentiveService();
  return { walletService, incentiveService };
}
