import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IncentiveService } from '../../src/services/incentive.service.js';
import { InMemoryIncentiveStore } from '../../src/services/incentive-store.js';
import { IncentivePoolClient } from '../../src/contracts/client.js';

const ADMIN = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
const RECIPIENT = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

async function makeService(store: InMemoryIncentiveStore) {
  const client = new IncentivePoolClient({
    contractId: 'CINCENTIVETESTCONTRACTID1234567890123456789012345678901234',
    adminSignerKey: ADMIN,
  });
  await client.initialize({ admin: ADMIN, token: 'CTOKEN123', upgradeAdmin: ADMIN });
  await client.deposit({ from: ADMIN, amount: 100_000_000n });
  return new IncentiveService({ client, adminSignerKey: ADMIN, store });
}

describe('IncentiveService persistence (#1359)', () => {
  it('writes queue configs and rewards through to the store', async () => {
    const store = new InMemoryIncentiveStore();
    const service = await makeService(store);
    service.setQueueConfig({ queueId: 'q1', enabled: true, rewardAmount: '2.5', asset: 'native' });
    await service.reward({ userId: 'u1', queueId: 'q1', recipient: RECIPIENT, idempotencyKey: 'k1' });

    assert.equal((await store.listQueueConfigs()).length, 1);
    const rewards = await store.listRewards();
    assert.equal(rewards.length, 1);
    assert.equal(rewards[0]!.status, 'confirmed');
    assert.equal(await store.getRewardIdByIdempotencyKey('k1'), rewards[0]!.id);
  });

  it('a new service hydrated from the store remembers rewards and configs after a restart', async () => {
    const store = new InMemoryIncentiveStore();
    const first = await makeService(store);
    first.setQueueConfig({ queueId: 'q1', enabled: true, rewardAmount: '2.5', asset: 'native' });
    const reward = await first.reward({ userId: 'u1', queueId: 'q1', recipient: RECIPIENT, idempotencyKey: 'k1' });

    const second = await makeService(store);
    await second.hydrate();
    assert.equal(second.getQueueConfig('q1')?.rewardAmount, '2.5');
    assert.equal(second.getReward(reward.id)?.status, 'confirmed');
    assert.equal(second.getUserRewards('u1').length, 1);
  });

  it('returns the stored reward for a repeated idempotency key, even after a restart', async () => {
    const store = new InMemoryIncentiveStore();
    const first = await makeService(store);
    first.setQueueConfig({ queueId: 'q1', enabled: true, rewardAmount: '2.5', asset: 'native' });
    const a = await first.reward({ userId: 'u1', queueId: 'q1', recipient: RECIPIENT, idempotencyKey: 'same' });

    const second = await makeService(store);
    await second.hydrate();
    const b = await second.reward({ userId: 'u1', queueId: 'q1', recipient: RECIPIENT, idempotencyKey: 'same' });
    assert.equal(b.id, a.id);
    assert.equal((await store.listRewards()).length, 1);
  });
});
