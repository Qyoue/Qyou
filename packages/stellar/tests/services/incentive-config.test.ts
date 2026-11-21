import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IncentiveService } from '../../src/services/incentive.service.js';
import { RewardNotifier } from '../../src/events/reward-notifier.js';
import type { QueueIncentiveConfig } from '../../src/eligibility/reward-eligibility.service.js';
import type { RewardRecord } from '../../src/services/incentive.service.js';

describe('IncentiveService per-queue config & notifications (#1015, #1017)', () => {
  let service: IncentiveService;
  const VALID_KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';

  beforeEach(async () => {
    service = new IncentiveService({
      adminSignerKey: VALID_KEY,
    });
    RewardNotifier.getInstance().clear();

    await service.getClient().initialize({
      admin: VALID_KEY,
      token: 'CTOKENADDRESS1234567890',
      upgradeAdmin: VALID_KEY,
    });
  });

  it('sets and retrieves per-queue incentive configuration (#1017)', () => {
    const config: QueueIncentiveConfig = {
      queueId: 'queue-express-lane',
      enabled: true,
      rewardAmount: '12.5000000',
      asset: 'native',
      maxRewardsPerUser: 2,
    };

    assert.equal(service.getQueueConfig('queue-express-lane'), null);
    service.setQueueConfig(config);

    const retrieved = service.getQueueConfig('queue-express-lane');
    assert.ok(retrieved);
    assert.equal(retrieved.rewardAmount, '12.5000000');
    assert.equal(retrieved.enabled, true);
    assert.equal(retrieved.maxRewardsPerUser, 2);
  });

  it('rewards participant using the queue-specific configuration amount (#1017)', async () => {
    // Deposit into pool first
    await service.getClient().deposit({
      from: VALID_KEY,
      amount: 100_000_000n,
    });

    service.setQueueConfig({
      queueId: 'queue-fast-pass',
      enabled: true,
      rewardAmount: '3.0000000',
      asset: 'native',
    });

    const reward = await service.reward({
      userId: 'user-winner-1',
      queueId: 'queue-fast-pass',
      recipient: VALID_KEY,
    });

    assert.equal(reward.status, 'confirmed');
    assert.equal(reward.amount, '3.0000000');
    assert.equal(reward.userId, 'user-winner-1');
    assert.ok(reward.transactionHash);
  });

  it('fails if queue has no incentive configuration (#1017)', async () => {
    await assert.rejects(
      () =>
        service.reward({
          userId: 'user-winner-2',
          queueId: 'queue-non-incentivized',
          recipient: VALID_KEY,
        }),
      /No incentive configuration defined/,
    );
  });

  it('RewardNotifier fires callback on confirmed reward (#1015)', () => {
    const notifier = RewardNotifier.getInstance();
    let notifiedReward: RewardRecord | null = null;

    const unsubscribe = notifier.subscribe((reward) => {
      notifiedReward = reward;
    });

    const testReward: RewardRecord = {
      id: 'reward-123',
      userId: 'user-test',
      queueId: 'queue-1',
      recipient: VALID_KEY,
      amount: '5.0000000',
      asset: 'native',
      status: 'confirmed',
      createdAt: Date.now(),
      confirmedAt: Date.now(),
    };

    notifier.notifyConfirmed(testReward);
    assert.ok(notifiedReward);
    assert.equal(notifiedReward.id, 'reward-123');

    // Unsubscribe works
    unsubscribe();
    notifiedReward = null;
    notifier.notifyConfirmed(testReward);
    assert.equal(notifiedReward, null);
  });
});
