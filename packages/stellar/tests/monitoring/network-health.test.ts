import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NetworkHealthTracker } from '../../src/monitoring/network-health.js';

describe('Stellar Upstream Network Health Monitor (#1064)', () => {
  let tracker: NetworkHealthTracker;

  beforeEach(() => {
    NetworkHealthTracker.resetInstance();
    tracker = NetworkHealthTracker.getInstance();
  });

  it('1. Initializes with unknown status when no samples exist', () => {
    const snapshot = tracker.getSnapshot();
    assert.equal(snapshot.overallStatus, 'unknown');
    assert.equal(snapshot.horizon.status, 'unknown');
    assert.equal(snapshot.soroban.status, 'unknown');
    assert.equal(snapshot.horizon.sampleCount, 0);
  });

  it('2. Evaluates healthy status when response times and error rates are optimal', () => {
    // Record healthy horizon samples
    tracker.recordHorizonSample({ latencyMs: 120, success: true, statusCode: 200 });
    tracker.recordHorizonSample({ latencyMs: 180, success: true, statusCode: 200 });
    tracker.recordHorizonSample({ latencyMs: 210, success: true, statusCode: 200 });

    // Record healthy soroban samples
    tracker.recordSorobanSample({ latencyMs: 250, success: true, statusCode: 200 });
    tracker.recordSorobanSample({ latencyMs: 320, success: true, statusCode: 200 });

    const snapshot = tracker.getSnapshot();
    assert.equal(snapshot.overallStatus, 'healthy');
    assert.equal(snapshot.horizon.status, 'healthy');
    assert.equal(snapshot.horizon.sampleCount, 3);
    assert.equal(snapshot.horizon.errorRatePercent, 0);
    assert.equal(snapshot.horizon.avgLatencyMs, 170);
    assert.equal(snapshot.soroban.status, 'healthy');
    assert.equal(snapshot.soroban.sampleCount, 2);
  });

  it('3. Evaluates degraded status when latency is high or intermittent errors occur', () => {
    // 20 samples, 2 failed = 10% error rate (> 5%)
    for (let i = 0; i < 18; i++) {
      tracker.recordHorizonSample({ latencyMs: 200, success: true, statusCode: 200 });
    }
    tracker.recordHorizonSample({ latencyMs: 200, success: false, error: '504 Gateway Timeout' });
    tracker.recordHorizonSample({ latencyMs: 200, success: false, error: '504 Gateway Timeout' });

    // Soroban remains healthy
    tracker.recordSorobanSample({ latencyMs: 300, success: true, statusCode: 200 });

    const snapshot = tracker.getSnapshot();
    assert.equal(snapshot.horizon.status, 'degraded');
    assert.equal(snapshot.horizon.errorRatePercent, 10);
    assert.equal(snapshot.horizon.lastError, '504 Gateway Timeout');
    assert.equal(snapshot.overallStatus, 'degraded');
  });

  it('4. Evaluates unhealthy status on critical error rate or prolonged timeouts', () => {
    // 4 failed out of 10 = 40% error rate (> 25%)
    for (let i = 0; i < 6; i++) {
      tracker.recordHorizonSample({ latencyMs: 100, success: true });
    }
    for (let i = 0; i < 4; i++) {
      tracker.recordHorizonSample({ latencyMs: 5000, success: false, error: 'Connection refused' });
    }

    const snapshot = tracker.getSnapshot();
    assert.equal(snapshot.horizon.status, 'unhealthy');
    assert.equal(snapshot.horizon.errorRatePercent, 40);
    assert.equal(snapshot.overallStatus, 'unhealthy');
  });
});
