/**
 * CLI entrypoints for wallet checks and payment dry-runs.
 * Usage:
 *   tsx src/cli.ts wallet-check <publicKey>
 *   tsx src/cli.ts payment-dry-run <senderPublicKey> <receiverPublicKey> <amount>
 */
import { server } from './index';
import { TransactionHelper } from './transactions';
import { Horizon } from '@stellar/stellar-sdk';

async function walletCheck(publicKey: string) {
  console.log(`🔎 Checking wallet: ${publicKey.slice(0, 8)}...`);
  try {
    const account = await server.loadAccount(publicKey);
    const xlm = account.balances.find(
      (b: Horizon.HorizonApi.BalanceLine) => b.asset_type === 'native',
    );
    console.log(`✅ Account exists. XLM balance: ${xlm?.balance ?? '0'}`);
  } catch (e: any) {
    console.error(`❌ Account not found or unreachable: ${e.message}`);
    process.exit(1);
  }
}

async function paymentDryRun(sender: string, receiver: string, amount: string) {
  console.log(`💸 Dry-run: ${amount} XLM from ${sender.slice(0, 8)}... → ${receiver.slice(0, 8)}...`);
  try {
    const tx = await TransactionHelper.buildPaymentTx(sender, receiver, amount, 'dry-run');
    const envelope = tx.toEnvelope().toXDR('base64');
    console.log('✅ Transaction built successfully (not submitted).');
    console.log('   XDR:', envelope.slice(0, 60) + '...');
  } catch (e: any) {
    console.error(`❌ Dry-run failed: ${e.message}`);
    process.exit(1);
  }
}

const [, , command, ...args] = process.argv;

(async () => {
  switch (command) {
    case 'wallet-check':
      if (!args[0]) { console.error('Usage: cli.ts wallet-check <publicKey>'); process.exit(1); }
      await walletCheck(args[0]);
      break;
    case 'payment-dry-run':
      if (args.length < 3) { console.error('Usage: cli.ts payment-dry-run <sender> <receiver> <amount>'); process.exit(1); }
      await paymentDryRun(args[0], args[1], args[2]);
      break;
    default:
      console.error('Unknown command. Use: wallet-check | payment-dry-run');
      process.exit(1);
  }
})();
