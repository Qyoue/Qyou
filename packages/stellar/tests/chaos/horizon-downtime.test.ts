import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IncentiveService } from '../../src/services/incentive.service.js';
import { IncentivePoolClient } from '../../src/contracts/client.js';
import { IncentivePoolContract } from '../../src/contracts/incentive-pool.js';

const ADMIN_KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
const RECIPIENT_KEY = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

describe('Chaos Testing: Horizon / RPC Downtime & Failure Recovery (#1048)', () => {
  function setupTestEnvironment() {
    const contract = new IncentivePoolContract();
    contract.initialize({
      admin: ADMIN_KEY,
      token: 'CDUMMYTOKENCONTRACT',
      upgradeAdmin: ADMIN_KEY,
      emergencyAdmin: ADMIN_KEY,
    });
    contract.deposit({ from: ADMIN_KEY, amount: 1_000_000_000n });

    const client = new IncentivePoolClient({
      contractId: 'CINCENTIVEPOOLTESTCONTRACT',
      adminSignerKey: ADMIN_KEY,
      contractInstance: contract,
    });

    return { contract, client };
  }

  it('1. Captures in-flight reward during Horizon downtime instead of silently losing state', async () => {
    const { client } = setupTestEnvironment();

    // Mock client.distribute to simulate Horizon downtime (HTTP 503 / Network Timeout)
    const originalDistribute = client.distribute.bind(client);
    client.distribute = async () => {
      throw new Error('Horizon error: 503 Service Unavailable [horizon.stellar.org down]');
    };

    const service = new IncentiveService({ client });
    service.setQueueConfig({
      queueId: 'q-chaos-1',
      enabled: true,
      rewardAmount: '5.0000000',
      asset: 'native',
    });

    // Payout attempt should throw
    await assert.rejects(
      async () => {
        await service.reward({
          userId: 'chaos-user-1',
          queueId: 'q-chaos-1',
          recipient: RECIPIENT_KEY,
        });
      },
      {
        message: /Horizon error: 503 Service Unavailable/,
      }
    );

    // Verify the in-flight reward was NOT lost:
    const allRewards = service.getAllRewards();
    assert.equal(allRewards.length, 1, 'In-flight reward must be recorded in system state');

    const inFlight = allRewards[0];
    assert.equal(inFlight.userId, 'chaos-user-1');
    assert.equal(inFlight.queueId, 'q-chaos-1');
    assert.equal(inFlight.recipient, RECIPIENT_KEY);
    assert.equal(inFlight.status, 'failed');
    assert.ok(inFlight.error?.includes('503 Service Unavailable'));
    assert.equal(inFlight.transactionHash, undefined);

    // Restore Horizon and retry reward
    client.distribute = originalDistribute;
    const recovered = await service.retryReward(inFlight.id);

    assert.equal(recovered.status, 'confirmed');
    assert.ok(recovered.transactionHash);
    assert.ok(recovered.confirmedAt);
    assert.equal(recovered.error, undefined);
  });

  it('2. Automatically recovers through rewardWithRetry() across intermittent downtime', async () => {
    const { client } = setupTestEnvironment();

    let attempts = 0;
    const originalDistribute = client.distribute.bind(client);

    // Simulate Horizon connection failing on first 2 attempts, then recovering on attempt 3
    client.distribute = async (params) => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`ECONNREFUSED: Connection refused by Horizon node (attempt ${attempts})`);
      }
      return originalDistribute(params);
    };

    const service = new IncentiveService({ client });
    service.setQueueConfig({
      queueId: 'q-chaos-2',
      enabled: true,
      rewardAmount: '10.0000000',
      asset: 'native',
    });

    const confirmed = await service.rewardWithRetry(
      {
        userId: 'chaos-user-2',
        queueId: 'q-chaos-2',
        recipient: RECIPIENT_KEY,
      },
      {
        maxAttempts: 4,
        initialDelayMs: 5,
        backoffFactor: 2,
      }
    );

    assert.equal(attempts, 3, 'Must have retried through the downtime until recovery');
    assert.equal(confirmed.status, 'confirmed');
    assert.equal(confirmed.amount, '10.0000000');
    assert.ok(confirmed.transactionHash);

    // Verify exactly one reward recorded
    const rewards = service.getAllRewards();
    assert.equal(rewards.length, 1);
  });

  it('3. Retains persistent record when downtime outlasts retry window for dead-letter processing', async () => {
    const { client } = setupTestEnvironment();

    // Constant Horizon outage
    client.distribute = async () => {
      throw new Error('ETIMEDOUT: Horizon RPC gateway timed out after 30000ms');
    };

    const service = new IncentiveService({ client });
    service.setQueueConfig({
      queueId: 'q-chaos-3',
      enabled: true,
      rewardAmount: '5.0000000',
      asset: 'native',
    });

    await assert.rejects(
      async () => {
        await service.rewardWithRetry(
          {
            userId: 'chaos-user-3',
            queueId: 'q-chaos-3',
            recipient: RECIPIENT_KEY,
          },
          {
            maxAttempts: 3,
            initialDelayMs: 5,
            backoffFactor: 1.5,
          }
        );
      },
      {
        message: /ETIMEDOUT: Horizon RPC gateway timed out/,
      }
    );

    // Assert payout state was safely retained for manual operator reconciliation
    const rewards = service.getAllRewards();
    assert.equal(rewards.length, 1);
    assert.equal(rewards[0].status, 'failed');
    assert.ok(rewards[0].error?.includes('ETIMEDOUT'));
  });
});
