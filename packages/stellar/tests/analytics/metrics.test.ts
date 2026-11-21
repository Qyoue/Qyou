import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DistributionMetricsCollector,
} from '../../src/analytics/metrics.js';
import { IncentiveService } from '../../src/services/incentive.service.js';
import { IncentivePoolContract } from '../../src/contracts/incentive-pool.js';
import { IncentivePoolClient } from '../../src/contracts/client.js';
import { WalletService } from '../../src/services/wallet.service.js';

describe('Stellar Distribution Metrics & Prometheus Exporter (#1062)', () => {
  let collector: DistributionMetricsCollector;

  beforeEach(() => {
    DistributionMetricsCollector.resetInstance();
    collector = DistributionMetricsCollector.getInstance();
  });

  it('1. Initializes empty metrics and empty histogram buckets', () => {
    const snapshot = collector.getSnapshot();
    assert.equal(snapshot.attempts, 0);
    assert.equal(snapshot.successes, 0);
    assert.equal(snapshot.failures, 0);
    assert.equal(snapshot.successRatePercent, 100);
    assert.equal(snapshot.latency.count, 0);
    assert.equal(snapshot.latency.avg, 0);
  });

  it('2. Records attempts, successes, and calculates accurate latency statistics', () => {
    collector.recordAttempt();
    collector.recordSuccess(100);

    collector.recordAttempt();
    collector.recordSuccess(200);

    collector.recordAttempt();
    collector.recordSuccess(300);

    collector.recordAttempt();
    collector.recordFailure('timeout', 1500);

    const snapshot = collector.getSnapshot();
    assert.equal(snapshot.attempts, 4);
    assert.equal(snapshot.successes, 3);
    assert.equal(snapshot.failures, 1);
    assert.equal(snapshot.successRatePercent, 75);
    assert.equal(snapshot.failureRatePercent, 25);
    assert.equal(snapshot.failuresByReason['timeout'], 1);

    // Latency stats
    const lat = snapshot.latency;
    assert.equal(lat.count, 4);
    assert.equal(lat.min, 100);
    assert.equal(lat.max, 1500);
    assert.equal(lat.sum, 2100);
    assert.equal(lat.avg, 525);
    assert.equal(lat.p50, 200);
    assert.equal(lat.p95, 1500);

    // Buckets
    assert.equal(lat.buckets['le_100'], 1);
    assert.equal(lat.buckets['le_250'], 2);
    assert.equal(lat.buckets['le_500'], 3);
    assert.equal(lat.buckets['le_2500'], 4);
    assert.equal(lat.buckets['le_Inf'], 4);
  });

  it('3. Generates valid Prometheus exposition format', () => {
    collector.recordAttempt();
    collector.recordSuccess(250);
    collector.recordAttempt();
    collector.recordFailure('insufficient_balance', 400);

    const prom = collector.toPrometheusFormat();

    assert.ok(prom.includes('# HELP stellar_distribution_attempts_total'));
    assert.ok(prom.includes('stellar_distribution_attempts_total 2'));
    assert.ok(prom.includes('stellar_distribution_successes_total 1'));
    assert.ok(prom.includes('stellar_distribution_failures_total 1'));
    assert.ok(prom.includes('stellar_distribution_failures_by_reason{reason="insufficient_balance"} 1'));
    assert.ok(prom.includes('stellar_distribution_confirmation_latency_ms_bucket{le="250"} 1'));
    assert.ok(prom.includes('stellar_distribution_confirmation_latency_ms_count 2'));
  });

  it('4. Automatically updates metrics during IncentiveService.reward() execution', async () => {
    const walletHelper = new WalletService();
    const admin = walletHelper.createAccount().publicKey;
    const upgradeAdmin = walletHelper.createAccount().publicKey;
    const recipient = walletHelper.createAccount().publicKey;

    const contract = new IncentivePoolContract();
    contract.initialize({
      admin,
      token: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
      upgradeAdmin,
    });

    const client = new IncentivePoolClient({
      contractId: 'CINCENTIVEPOOLTESTNETCONTRACT1234567890ABCDEF',
      adminSignerKey: admin,
      contractInstance: contract,
    });

    // Deposit funds
    await client.deposit({ from: admin, amount: 100_000_000n });

    const incentiveService = new IncentiveService({
      client,
      adminSignerKey: admin,
      metrics: collector,
    });

    incentiveService.setQueueConfig({
      queueId: 'q-metrics-1',
      enabled: true,
      rewardAmount: '2.5000000',
      asset: 'native',
    });

    // Before reward
    assert.equal(collector.getSnapshot().attempts, 0);

    // Successful reward
    await incentiveService.reward({
      userId: 'user-m-1',
      queueId: 'q-metrics-1',
      recipient,
    });

    const afterSuccess = collector.getSnapshot();
    assert.equal(afterSuccess.attempts, 1);
    assert.equal(afterSuccess.successes, 1);
    assert.equal(afterSuccess.failures, 0);
    assert.equal(afterSuccess.latency.count, 1);

    // Failed reward (duplicate claim not eligible)
    await assert.rejects(
      async () => {
        await incentiveService.reward({
          userId: 'user-m-1',
          queueId: 'q-metrics-1',
          recipient,
        });
      },
      /Participant not eligible/
    );
  });
});
