import { TransactionHelper } from './transactions';
import { WalletManager } from './wallet';

async function runPaymentTest() {
  console.log('--- Starting Payment Transaction Test ---');

  console.log('\nCreating SENDER...');
  const sender = WalletManager.createRandom();
  await WalletManager.fundAccount(sender.publicKey);

  console.log('\nCreating RECEIVER...');
  const receiver = WalletManager.createRandom();
  console.log(`   Receiver Public Key: ${receiver.publicKey}`);

  console.log('\nBuilding Payment Transaction (50 XLM)...');
  const amount = '50';
  const memo = 'Qyou Reward';

  try {
    const transaction = await TransactionHelper.buildPaymentTx(
      sender.publicKey,
      receiver.publicKey,
      amount,
      memo,
    );

    transaction.sign(sender.pair);

    await TransactionHelper.submitTx(transaction);
    console.log(
      `\n🎉 Payment Complete! Sent ${amount} XLM to ${receiver.publicKey.slice(0, 5)}...`,
    );
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

runPaymentTest();
