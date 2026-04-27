import { MockRewardService } from './rewards';

async function runRewardTest() {
  console.log('--- 🏆 Starting Mock Reward Test ---');

  const rewards = new MockRewardService();
  const userId = 'G_TEST_USER_123';

  console.log(`\n1. Initial Balance: ${await rewards.getBalance(userId)}`);

  console.log('\n2. User reporting a queue...');
  const earnTx = await rewards.earn(userId, 50, 'Report: GTBank Lekki');
  console.log(`   ✅ Earned 50 points! TxID: ${earnTx.id}`);
  console.log(`   New Balance: ${await rewards.getBalance(userId)}`);

  await rewards.earn(userId, 25, 'Report: Shoprite Ikeja');
  console.log(`   ✅ Earned 25 points!`);
  console.log(`   New Balance: ${await rewards.getBalance(userId)}`);

  console.log('\n3. User claiming 60 points...');
  try {
    const claimTx = await rewards.claim(userId, 60);
    console.log(`   ✅ Claim Successful! TxID: ${claimTx.id}`);
  } catch (e: any) {
    console.error(`   ❌ Claim Failed: ${e.message}`);
  }

  console.log(`\n4. Final Balance: ${await rewards.getBalance(userId)}`);

  console.log('\n5. Transaction History:');
  const history = await rewards.getHistory(userId);
  console.table(
    history.map((tx) => ({ type: tx.type, amount: tx.amount, memo: tx.memo })),
  );
}

runRewardTest();

export async function smokeTestRewards(): Promise<boolean> {
  try {
    const rewards = new MockRewardService();
    const testUser = 'SMOKE_TEST_USER';
    const balance = await rewards.getBalance(testUser);
    if (typeof balance !== 'number') return false;
    console.log('✅ Rewards smoke test passed');
    return true;
  } catch {
    console.error('❌ Rewards smoke test failed');
    return false;
  }
}
