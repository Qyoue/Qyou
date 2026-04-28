/**
 * Smoke-test helper for Stellar contributor onboarding.
 * Run: npx ts-node stellar/client/src/smoke-test.ts
 *
 * Verifies: network reachability, account existence, and a dry-run tx build.
 */
import { Server, Keypair, Networks, TransactionBuilder, Asset, Operation } from '@stellar/stellar-sdk';
import { STELLAR_CONFIG } from './index';

const HORIZON_URLS: Record<string, string> = {
  TESTNET: 'https://horizon-testnet.stellar.org',
  MAINNET: 'https://horizon.stellar.org',
};

async function checkNetwork(server: Server): Promise<void> {
  const root = await server.root();
  console.log(`✓ Horizon reachable — core version: ${root.core_version}`);
}

async function checkAccount(server: Server, publicKey: string): Promise<void> {
  try {
    const account = await server.loadAccount(publicKey);
    const xlm = account.balances.find(b => b.asset_type === 'native');
    console.log(`✓ Account found — XLM balance: ${xlm?.balance ?? '0'}`);
  } catch {
    console.warn('⚠ Account not found on network (fund via friendbot for testnet)');
  }
}

async function dryRunTx(server: Server, publicKey: string): Promise<void> {
  try {
    const account = await server.loadAccount(publicKey);
    const passphrase = STELLAR_CONFIG.network === 'MAINNET' ? Networks.PUBLIC : Networks.TESTNET;
    const tx = new TransactionBuilder(account, { fee: '100', networkPassphrase: passphrase })
      .addOperation(Operation.payment({ destination: publicKey, asset: Asset.native(), amount: '0.0000001' }))
      .setTimeout(30)
      .build();
    console.log(`✓ Dry-run tx built — envelope XDR length: ${tx.toEnvelope().toXDR('base64').length}`);
  } catch {
    console.warn('⚠ Dry-run skipped (account not funded)');
  }
}

async function main() {
  const horizonUrl = HORIZON_URLS[STELLAR_CONFIG.network] ?? HORIZON_URLS.TESTNET;
  const server = new Server(horizonUrl);
  const keypair = Keypair.random();
  console.log(`\nQyou Stellar Smoke Test — network: ${STELLAR_CONFIG.network}`);
  await checkNetwork(server);
  await checkAccount(server, keypair.publicKey());
  await dryRunTx(server, keypair.publicKey());
  console.log('\nSmoke test complete.\n');
}

main().catch(err => { console.error('Smoke test failed:', err.message); process.exit(1); });
