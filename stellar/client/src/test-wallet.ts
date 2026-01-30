import { stellarServer } from './index';
import { WalletManager } from './wallet';

async function runWalletTest() {
  console.log('--- 💰 Starting Wallet & Auto-Funding Test ---');

  const newWallet = WalletManager.createRandom();
  console.log(`\n🔑 Created New Identity:`);
  console.log(`   Public: ${newWallet.publicKey}`);
  console.log(
    `   Secret: ${newWallet.secret} (⚠️ SAVE THIS LOCALLY IF YOU WANT TO KEEP IT)`,
  );

  console.log(`\n💸 Attempting to fund account...`);
  const success = await WalletManager.fundAccount(newWallet.publicKey);

  if (!success) {
    console.log('🛑 Funding failed. Stopping test.');
    return;
  }

  console.log(`\n🔎 Verifying balance on Stellar Testnet...`);
  try {
    const account = await stellarServer.loadAccount(newWallet.publicKey);

    const xlmBalance = account.balances.find((b) => b.asset_type === 'native');

    console.log(`\n🎉 SUCCESS! Account Balance:`);
    console.log(`   >> ${xlmBalance?.balance} XLM`);
  } catch (e: any) {
    console.error(
      '❌ Could not load account details. It might take a few seconds to propagate.',
      e.message,
    );
  }
}

runWalletTest();
