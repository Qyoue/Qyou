import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IncentiveService } from '../../src/services/incentive.service.js';
import { IncentivePoolClient } from '../../src/contracts/client.js';
import { RewardEligibilityService } from '../../src/eligibility/reward-eligibility.service.js';
import { ContractInsufficientBalanceError } from '../../src/contracts/incentive-pool.js';

describe('IncentiveService Unit Tests: Distribution, Idempotency, Failure & Retry (#1039)', () => {
  const ADMIN_KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  const RECIPIENT_KEY = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
  let client: IncentivePoolClient;
  let service: IncentiveService;

  beforeEach(async () => {
    client = new IncentivePoolClient({
      contractId: 'CINCENTIVETESTCONTRACTID1234567890123456789012345678901234',
      adminSignerKey: ADMIN_KEY,
    });
    await client.initialize({
      admin: ADMIN_KEY,
      token: 'CTOKEN123',
      upgradeAdmin: ADMIN_KEY,
    });
    await client.deposit({
      from: ADMIN_KEY,
      amount: 100_000_000n, // 10 XLM
    });

    service = new IncentiveService({
      client,
      adminSignerKey: ADMIN_KEY,
    });

    service.setQueueConfig({
      queueId: 'q-standard',
      enabled: true,
      rewardAmount: '2.5',
      asset: 'native',
      maxRewardsPerUser: 3,
    });
  });

  describe('Happy Path Distribution & Accounting', () => {
    it('successfully processes queue completion reward and deducts from contract balance', async () => {
      const initialBalance = await service.getPoolBalance();
      assert.equal(initialBalance, 100_000_000n);

      const reward = await service.reward({
        userId: 'user-happy-1',
        queueId: 'q-standard',
        recipient: RECIPIENT_KEY,
      });

      assert.equal(reward.status, 'confirmed');
      assert.equal(reward.amount, '2.5');
      assert.ok(reward.transactionHash);

      const postBalance = await service.getPoolBalance();
      assert.equal(postBalance, 75_000_000n); // 100m - 25m = 75m
    });
  });

  describe('Idempotency Handling', () => {
    it('handles identical idempotency keys without duplicate balance deduction', async () => {
      const idempotencyKey = 'qreward:user-idem:q-standard:session-1';

      const reward1 = await service.reward({
        userId: 'user-idem',
        queueId: 'q-standard',
        recipient: RECIPIENT_KEY,
        idempotencyKey,
      });
      assert.equal(reward1.status, 'confirmed');

      const balAfterFirst = await service.getPoolBalance();

      // Submit identical request
      const reward2 = await service.reward({
        userId: 'user-idem',
        queueId: 'q-standard',
        recipient: RECIPIENT_KEY,
        idempotencyKey,
      });
      assert.equal(reward2.status, 'confirmed');
      assert.equal(reward2.transactionHash, reward1.transactionHash);

      const balAfterSecond = await service.getPoolBalance();
      assert.equal(balAfterSecond, balAfterFirst); // No duplicate deduction
    });
  });

  describe('Failure Paths', () => {
    it('fails when queue configuration does not exist', async () => {
      await assert.rejects(
        async () => {
          await service.reward({
            userId: 'user-missing-cfg',
            queueId: 'non-existent-queue',
            recipient: RECIPIENT_KEY,
          });
        },
        (err: Error) => {
          assert.match(err.message, /No incentive configuration defined for queue/);
          return true;
        }
      );
    });

    it('fails when recipient has an invalid public key', async () => {
      await assert.rejects(
        async () => {
          await service.reward({
            userId: 'user-bad-key',
            queueId: 'q-standard',
            recipient: 'MALFORMED_RECIPIENT_KEY',
          });
        },
        (err: Error) => {
          assert.match(err.message, /Participant not eligible for reward/);
          return true;
        }
      );
    });

    it('fails when contract balance is insufficient to cover reward', async () => {
      // Configure high reward amount exceeding pool balance (100 XLM > 10 XLM)
      service.setQueueConfig({
        queueId: 'q-whale',
        enabled: true,
        rewardAmount: '100.0',
        asset: 'native',
      });

      await assert.rejects(
        async () => {
          await service.reward({
            userId: 'user-overdraw',
            queueId: 'q-whale',
            recipient: RECIPIENT_KEY,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof ContractInsufficientBalanceError);
          return true;
        }
      );
    });
  });

  describe('Failure Recovery & Retry Path (#1039)', () => {
    it('records failed reward status and allows retryReward() to recover once funded', async () => {
      // Empty the pool
      service.setQueueConfig({
        queueId: 'q-empty',
        enabled: true,
        rewardAmount: '20.0', // 20 XLM > 10 XLM available
        asset: 'native',
      });

      let failedRewardId = '';
      try {
        await service.reward({
          userId: 'user-retry-1',
          queueId: 'q-empty',
          recipient: RECIPIENT_KEY,
        });
      } catch (err) {
        // Expected failure
        const allRewards = service.getAllRewards();
        const failed = allRewards.find((r) => r.userId === 'user-retry-1');
        assert.ok(failed);
        assert.equal(failed?.status, 'failed');
        failedRewardId = failed!.id;
      }

      assert.ok(failedRewardId);

      // Now deposit funds to replenish the pool
      await client.deposit({
        from: ADMIN_KEY,
        amount: 300_000_000n, // 30 XLM
      });

      // Execute retry
      const recovered = await service.retryReward(failedRewardId);
      assert.equal(recovered.status, 'confirmed');
      assert.ok(recovered.transactionHash);
      assert.equal(recovered.error, undefined);
    });
  });
});
