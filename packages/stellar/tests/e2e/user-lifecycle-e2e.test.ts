import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  WalletService,
  IncentiveService,
  RewardNotifier,
  StellarAnalyticsTracker,
  StellarAnalyticsEventType,
} from '../../src/index.js';
import type { RewardRecord } from '../../src/services/incentive.service.js';

describe('E2E Integration: Register → Link Wallet → Queue Completion → Reward Confirmed (#1022)', () => {
  const ADMIN_KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  const RECIPIENT_KEY = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
  const QUEUE_ID = 'queue-airport-fast-track';
  const USER_ID = 'user-e2e-traveler-99';

  it('successfully executes the full end-to-end incentive lifecycle', async () => {
    // 1. Initialize Stellar Core Services & Contracts
    const incentiveService = new IncentiveService({
      adminSignerKey: ADMIN_KEY,
    });
    const walletService = new WalletService();
    const analytics = StellarAnalyticsTracker.getInstance();
    const notifier = RewardNotifier.getInstance();

    await incentiveService.getClient().initialize({
      admin: ADMIN_KEY,
      token: 'CTOKENADDRESS1234567890',
      upgradeAdmin: ADMIN_KEY,
    });

    // 2. Initial Pool Deposit by Operator (fund incentive pool)
    const initialPoolDeposit = 500_000_000n; // 50 XLM in stroops
    await incentiveService.getClient().deposit({
      from: ADMIN_KEY,
      amount: initialPoolDeposit,
    });

    const initialBalance = await incentiveService.getPoolBalance();
    assert.equal(initialBalance, initialPoolDeposit);

    // 3. User links their Stellar Wallet
    analytics.track({
      eventType: StellarAnalyticsEventType.WALLET_CONNECT_ATTEMPT,
      userId: USER_ID,
    });

    const linkedWallet = walletService.linkWallet(USER_ID, RECIPIENT_KEY);
    assert.equal(linkedWallet.userId, USER_ID);
    assert.equal(linkedWallet.publicKey, RECIPIENT_KEY);

    analytics.track({
      eventType: StellarAnalyticsEventType.WALLET_CONNECTED,
      userId: USER_ID,
      publicKey: RECIPIENT_KEY,
    });

    // 4. Operator configures queue incentives
    incentiveService.setQueueConfig({
      queueId: QUEUE_ID,
      enabled: true,
      rewardAmount: '5.0000000',
      asset: 'native',
      maxRewardsPerUser: 1,
    });

    // 5. User joins and completes queue wait
    // Queue completion hook triggers reward distribution
    let notificationReceived: RewardRecord | null = null;
    const unsubNotifier = notifier.subscribe((reward) => {
      notificationReceived = reward;
    });

    const rewardRecord = await incentiveService.reward({
      userId: USER_ID,
      queueId: QUEUE_ID,
      recipient: linkedWallet.publicKey,
    });

    // 6. Verify on-chain reward confirmation and state transition
    assert.equal(rewardRecord.status, 'confirmed');
    assert.equal(rewardRecord.amount, '5.0000000');
    assert.equal(rewardRecord.userId, USER_ID);
    assert.ok(rewardRecord.transactionHash);
    assert.ok(rewardRecord.confirmedAt! > 0);

    // 7. Verify pool balance decremented
    const finalBalance = await incentiveService.getPoolBalance();
    const expectedStroopsDeducted = 50_000_000n; // 5 XLM
    assert.equal(finalBalance, initialPoolDeposit - expectedStroopsDeducted);

    // 8. Verify notification delivered to user
    assert.ok(notificationReceived);
    assert.equal(notificationReceived.id, rewardRecord.id);

    // 9. Verify analytics trail recorded
    const recentAnalytics = analytics.getRecentEvents();
    assert.ok(
      recentAnalytics.some((e) => e.eventType === StellarAnalyticsEventType.WALLET_CONNECTED),
    );

    unsubNotifier();
  });
});
