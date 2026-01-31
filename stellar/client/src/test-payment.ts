import { TransactionHelper } from './transactions';
import { WalletManager } from './wallet';
import { Keypair } from '@stellar/stellar-sdk';

async function runPaymentTest() {
  console.log('--- 💸 Starting Payment Transaction Test ---');

  console.log('\n1. Creating SENDER...');
  const sender = WalletManager.createRandom();
  const funded = await WalletManager.fundAccount(sender.publicKey);

  if (!funded) {
    console.error('❌ Failed to fund sender. Aborting.');
    return;
  }

  console.log('\n2. Creating RECEIVER...');
  const receiver = WalletManager.createRandom();
  console.log(`   Receiver Public Key: ${receiver.publicKey}`);

  console.log('\n3. Building Payment Transaction (50 XLM)...');
  const amount = '50';
  const memo = 'Qyou Reward';

  try {
    const transaction = await TransactionHelper.buildPaymentTx(
      sender.publicKey,
      receiver.publicKey,
      amount,
      memo,
    );

    const senderKeypair = Keypair.fromSecret(sender.secret);
    transaction.sign(senderKeypair);

    await TransactionHelper.submitTx(transaction);
    console.log(
      `\n🎉 Payment Complete! Sent ${amount} XLM to ${receiver.publicKey.slice(0, 5)}...`,
    );
  } catch (error) {
    console.error('Test Failed:', error);
  }
}

runPaymentTest();
