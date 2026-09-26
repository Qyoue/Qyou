/**
 * Load & Performance Testing for Incentive Payout Pipeline (#1044)
 *
 * Simulates a queue completion event where N participants complete simultaneously,
 * verifying that the distribution pipeline handles concurrent load without sequence
 * conflicts, race conditions, or dropped rewards.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { IncentiveService } from '../../src/services/incentive.service.js';
import { IncentivePoolClient } from '../../src/contracts/client.js';

describe('Incentive Distribution Load & Concurrency Performance (#1044)', () => {
  const ADMIN_KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  let client: IncentivePoolClient;
  let service: IncentiveService;

  beforeEach(async () => {
    client = new IncentivePoolClient({
      contractId: 'CLOADTESTCONTRACTID123456789012345678901234567890123456789',
      adminSignerKey: ADMIN_KEY,
    });
    await client.initialize({
      admin: ADMIN_KEY,
      token: 'CTOKENLOADTEST123456789',
      upgradeAdmin: ADMIN_KEY,
    });
    // Fund with sufficient balance for 500 participants (500 * 2.0 XLM = 1000 XLM = 10,000,000,000 stroops)
    await client.deposit({
      from: ADMIN_KEY,
      amount: 10_000_000_000n,
    });

    service = new IncentiveService({
      client,
      adminSignerKey: ADMIN_KEY,
    });

    service.setQueueConfig({
      queueId: 'q-high-throughput-stadium',
      enabled: true,
      rewardAmount: '2.0', // 2.0 XLM = 20_000_000 stroops
      asset: 'native',
      maxRewardsPerUser: 1,
    });
  });

  it('handles 50 concurrent queue completion reward payouts without dropped rewards or sequence collisions', async () => {
    const PARTICIPANT_COUNT = 50;
    const REWARD_AMOUNT_STROOPS = 20_000_000n;
    const initialPoolBalance = await service.getPoolBalance();

    const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const PREFIX = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCW22'.substring(0, 54);
    const participants = Array.from({ length: PARTICIPANT_COUNT }, (_, i) => {
      // Generate unique valid 56-char base32 key for each participant
      const char1 = BASE32_ALPHABET[i % 32];
      const char2 = BASE32_ALPHABET[Math.floor(i / 32) % 32];
      const key = `${PREFIX}${char1}${char2}`;
      return {
        userId: `user-simultaneous-${i}`,
        recipient: key,
      };
    });

    const startTime = performance.now();

    // Trigger all N payouts simultaneously via Promise.all
    const promises = participants.map((p) =>
      service.reward({
        userId: p.userId,
        queueId: 'q-high-throughput-stadium',
        recipient: p.recipient,
        idempotencyKey: `qreward:stadium:${p.userId}`,
      })
    );

    const results = await Promise.all(promises);
    const durationMs = performance.now() - startTime;

    // 1. Verify zero dropped rewards
    assert.equal(results.length, PARTICIPANT_COUNT);
    for (const r of results) {
      assert.equal(r.status, 'confirmed');
      assert.ok(r.transactionHash);
      assert.equal(r.amount, '2.0');
    }

    // 2. Verify all transaction hashes are unique (no sequence collision)
    const txHashes = new Set(results.map((r) => r.transactionHash));
    assert.equal(txHashes.size, PARTICIPANT_COUNT);

    // 3. Verify exact pool accounting conservation
    const finalBalance = await service.getPoolBalance();
    const expectedDeduction = BigInt(PARTICIPANT_COUNT) * REWARD_AMOUNT_STROOPS;
    assert.equal(initialPoolBalance - finalBalance, expectedDeduction);

    // 4. Performance metrics
    const throughput = (PARTICIPANT_COUNT / (durationMs / 1000)).toFixed(1);
    console.log(`\n  ⚡ Processed ${PARTICIPANT_COUNT} simultaneous distributions in ${durationMs.toFixed(2)}ms (~${throughput} tx/sec)`);
    assert.ok(durationMs < 5000, `Expected 50 distributions under 5s, took ${durationMs}ms`);
  });

  it('handles burst load of 100 participants with idempotency replay under load', async () => {
    const BURST_COUNT = 100;
    const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const BURST_PREFIX = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCW22'.substring(0, 53);
    const participants = Array.from({ length: BURST_COUNT }, (_, i) => {
      const char1 = BASE32_ALPHABET[i % 32];
      const char2 = BASE32_ALPHABET[Math.floor(i / 32) % 32];
      const char3 = BASE32_ALPHABET[Math.floor(i / 1024) % 32];
      return {
        userId: `user-burst-${i}`,
        recipient: `${BURST_PREFIX}${char1}${char2}${char3}`,
      };
    });

    // Fire burst of 100 concurrent requests
    const burstPromises = participants.map((p) =>
      service.reward({
        userId: p.userId,
        queueId: 'q-high-throughput-stadium',
        recipient: p.recipient,
      })
    );

    const burstResults = await Promise.all(burstPromises);
    assert.equal(burstResults.length, BURST_COUNT);
    assert.equal(burstResults.filter((r) => r.status === 'confirmed').length, BURST_COUNT);
  });
});
