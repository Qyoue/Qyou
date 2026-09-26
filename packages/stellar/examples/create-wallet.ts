/**
 * Example: Stellar Account Creation and Wallet Linking
 *
 * Demonstrates:
 * 1. Generating a new Stellar Ed25519 keypair
 * 2. Validating the public key StrKey format
 * 3. Safely sanitizing the secret seed for logging
 * 4. Linking the wallet to an application user
 * 5. Querying wallet balance and establishing a trustline
 *
 * Usage:
 *   npm run example:wallet -w @qyou/stellar
 */

import { WalletService } from '../src/services/wallet.service.js';
import { LogSanitizer } from '../src/security/log-sanitizer.js';

async function main(): Promise<void> {
  console.log('--- Stellar Wallet Service Example ---\n');

  // 1. Initialize WalletService with simulated balance provider for local exploration
  const walletService = new WalletService({
    cacheTtlMs: 15_000,
    balanceProvider: async (pk) => ({
      xlm: '10.0000000',
      balances: [
        { asset: 'native', balance: '10.0000000', isNative: true },
      ],
    }),
  });

  // 2. Generate a new keypair
  console.log('1. Generating new Stellar keypair...');
  const keypair = walletService.createAccount();

  console.log(`   Public Key (StrKey): ${keypair.publicKey}`);
  // Always sanitize secrets when logging!
  const sanitizedSecret = LogSanitizer.maskString(keypair.secretKey);
  console.log(`   Secret Seed (Masked): ${sanitizedSecret}`);

  // 3. Verify public key validity
  const isValid = walletService.isValidPublicKey(keypair.publicKey);
  console.log(`   Is valid Stellar public key: ${isValid}`);
  if (!isValid) {
    throw new Error('Generated keypair contains invalid public key format');
  }

  // 4. Link wallet to a user
  const userId = 'usr_example_dev_42';
  console.log(`\n2. Linking wallet to user "${userId}"...`);
  const linkedAccount = walletService.linkWallet(userId, keypair.publicKey);
  console.log('   Successfully linked account:', {
    userId: linkedAccount.userId,
    publicKey: linkedAccount.publicKey,
    linkedAt: new Date(linkedAccount.createdAt).toISOString(),
  });

  // 5. Query initial balance
  console.log('\n3. Querying account balance...');
  const balances = await walletService.getBalances(keypair.publicKey);
  console.log(`   Native XLM Balance: ${balances.xlm} XLM`);
  console.log(`   Retrieved from cache: ${balances.fromCache}`);

  // 6. Establish a trustline for custom reward asset
  const assetCode = 'QREWARD';
  const issuerKey = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
  console.log(`\n4. Adding trustline for asset ${assetCode}:${issuerKey}...`);
  const trustlineResult = await walletService.addTrustline({
    publicKey: keypair.publicKey,
    assetCode,
    issuer: issuerKey,
    limit: '50000',
  });
  console.log('   Trustline established:', trustlineResult);

  const hasTrustline = await walletService.hasTrustline(keypair.publicKey, assetCode, issuerKey);
  console.log(`   Verified trustline present: ${hasTrustline}`);

  console.log('\n--- Wallet Example Completed Successfully ---');
}

main().catch((err) => {
  console.error('Wallet example failed:', err);
  process.exit(1);
});
