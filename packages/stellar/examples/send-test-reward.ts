/**
 * Example: Stellar Testnet Reward Distribution
 *
 * Demonstrates:
 * 1. Initializing the Soroban IncentivePool contract simulator and client
 * 2. Depositing testnet funding into the incentive pool
 * 3. Configuring queue incentive rules
 * 4. Subscribing to confirmed reward notifications
 * 5. Dispatching an authorized reward payout to an eligible queue participant
 * 6. Enforcing idempotency on retry
 *
 * Usage:
 *   npm run example:reward -w @qyou/stellar
 */

import { IncentivePoolContract } from '../src/contracts/incentive-pool.js';
import { IncentivePoolClient } from '../src/contracts/client.js';
import { IncentiveService } from '../src/services/incentive.service.js';
import { RewardNotifier } from '../src/events/reward-notifier.js';
import { WalletService } from '../src/services/wallet.service.js';

async function main(): Promise<void> {
  console.log('--- Stellar Incentive Pool Reward Distribution Example ---\n');

  const walletHelper = new WalletService();
  const adminAccount = walletHelper.createAccount();
  const recipientAccount = walletHelper.createAccount();
  const tokenAddress = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
  const upgradeAdmin = walletHelper.createAccount().publicKey;

  const adminAddress = adminAccount.publicKey;
  const recipientWallet = recipientAccount.publicKey;

  // 1. Initialize Contract Simulator and Client
  console.log('1. Initializing Soroban Incentive Pool Contract & Client...');
  const contract = new IncentivePoolContract();
  contract.initialize({
    admin: adminAddress,
    token: tokenAddress,
    upgradeAdmin,
  });

  const client = new IncentivePoolClient({
    contractId: 'CINCENTIVEPOOLTESTNETCONTRACT1234567890ABCDEF',
    adminSignerKey: adminAddress,
    contractInstance: contract,
  });

  // 2. Deposit funds into the incentive pool
  console.log('2. Depositing test funds into the pool contract...');
  const depositResult = await client.deposit({
    from: adminAddress,
    // 500 XLM in stroops (500 * 10^7)
    amount: 5_000_000_000n,
  });
  console.log(`   Deposit successful. Pool balance: ${depositResult.newBalance} stroops (tx: ${depositResult.txHash})`);

  // 3. Initialize IncentiveService
  const incentiveService = new IncentiveService({
    client,
    adminSignerKey: adminAddress,
  });

  // 4. Configure Queue Incentive Rules
  const queueId = 'queue_rush_hour_demo_99';
  console.log(`\n3. Configuring incentive rules for queue "${queueId}"...`);
  incentiveService.setQueueConfig({
    queueId,
    enabled: true,
    rewardAmount: '5.0000000',
    asset: 'native',
    maxRewardsPerUser: 1,
  });
  console.log('   Queue config registered: 5.0 XLM reward per eligible participant');

  // 5. Subscribe to reward event notifications
  const unsubscribe = RewardNotifier.getInstance().subscribe((reward) => {
    console.log(`   [EVENT NOTIFICATION] Reward ${reward.id} confirmed on-chain! Tx: ${reward.transactionHash}`);
  });

  // 6. Execute reward distribution
  const userId = 'usr_participant_alpha';
  console.log(`\n4. Distributing reward to user "${userId}" at wallet ${recipientWallet}...`);
  const rewardRecord = await incentiveService.reward({
    userId,
    queueId,
    recipient: recipientWallet,
    idempotencyKey: `payout:${userId}:${queueId}`,
  });

  console.log('\n5. Reward Execution Result:');
  console.log(`   Reward ID:        ${rewardRecord.id}`);
  console.log(`   Status:           ${rewardRecord.status}`);
  console.log(`   Amount:           ${rewardRecord.amount} XLM`);
  console.log(`   Transaction Hash: ${rewardRecord.transactionHash}`);
  console.log(`   Confirmed At:     ${new Date(rewardRecord.confirmedAt || Date.now()).toISOString()}`);

  // Unsubscribe listener
  unsubscribe();
  console.log('\n--- Testnet Reward Example Completed Successfully ---');
}

main().catch((err) => {
  console.error('Reward example failed:', err);
  process.exit(1);
});
