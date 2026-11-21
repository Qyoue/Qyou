import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  MultiSigService,
  DistributionGuard,
  WalletAbuseDetector,
} from '../../src/security/index.js';

describe('Security Safeguards: Multi-Sig, Limits & Abuse Detection (#1026, #1027, #1029)', () => {
  const VALID_KEY_1 = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  const VALID_KEY_2 = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
  const VALID_KEY_3 = 'GCXTAQ5QG3Z2YOMRLP2BGLF3J5O2U76X6U32V25W75L27YQ7H37K6Z5A';

  describe('Multi-Sig Configuration & Quorums (#1026)', () => {
    it('creates and validates a standard 2-of-3 production threshold policy', () => {
      const policy = MultiSigService.createProductionPolicy(VALID_KEY_1, [
        VALID_KEY_2,
        VALID_KEY_3,
      ]);

      const validation = MultiSigService.validatePolicy(policy);
      assert.equal(validation.valid, true);
      assert.equal(validation.errors.length, 0);
      assert.equal(validation.totalWeight, 3);
      assert.equal(policy.medThreshold, 2);
      assert.equal(policy.highThreshold, 3);
    });

    it('rejects policy where combined signer weights cannot reach high threshold (lockout risk)', () => {
      const invalidPolicy = {
        accountId: VALID_KEY_1,
        masterWeight: 1,
        lowThreshold: 1,
        medThreshold: 2,
        highThreshold: 5, // Impossible to reach with weight 2
        signers: [{ publicKey: VALID_KEY_2, weight: 1 }],
      };

      const validation = MultiSigService.validatePolicy(invalidPolicy);
      assert.equal(validation.valid, false);
      assert.ok(validation.errors.some((e) => e.includes('locking the account')));
    });
  });

  describe('Distribution Amount Limits & Anomaly Detection (#1027)', () => {
    let guard: DistributionGuard;

    beforeEach(() => {
      guard = new DistributionGuard({
        maxPerTransaction: 50.0,
        maxDailyVolume: 200.0,
        alertThresholdRatio: 3.0,
      });
    });

    it('permits distribution within transaction and daily velocity caps', () => {
      const result = guard.evaluate(25.0, 10.0);
      assert.equal(result.allowed, true);
      assert.equal(result.isAnomaly, false);

      guard.commit(25.0);
      assert.equal(guard.getCurrentDailyVolume(), 25.0);
    });

    it('rejects distribution exceeding per-transaction cap', () => {
      const result = guard.evaluate(75.0, 10.0);
      assert.equal(result.allowed, false);
      assert.match(result.reason!, /exceeds maximum per-transaction cap/);
      assert.equal(result.isAnomaly, true);
    });

    it('rejects distribution exceeding 24-hour cumulative volume cap', () => {
      guard.commit(180.0);
      const result = guard.evaluate(30.0, 10.0); // 180 + 30 = 210 > 200
      assert.equal(result.allowed, false);
      assert.match(result.reason!, /exceed 24-hour distribution limit/);
    });

    it('flags transaction as anomaly when exceeding 3x standard queue reward', () => {
      const result = guard.evaluate(35.0, 10.0); // 35 >= 10 * 3
      assert.equal(result.allowed, true);
      assert.equal(result.isAnomaly, true);
    });
  });

  describe('Wallet Abuse & Multi-Account Farming Detection (#1029)', () => {
    let detector: WalletAbuseDetector;

    beforeEach(() => {
      detector = new WalletAbuseDetector({
        maxLinksPerHourPerUser: 2,
        maxLinksPerHourPerIp: 3,
      });
    });

    it('permits legitimate first-time wallet linking', () => {
      const res = detector.evaluate({
        userId: 'u-1',
        publicKey: VALID_KEY_1,
        clientIp: '192.168.1.1',
      });
      assert.equal(res.allowed, true);
      assert.equal(res.isFlagged, false);

      detector.recordLink('u-1', VALID_KEY_1, '192.168.1.1');
    });

    it('blocks multi-account public key reuse (farming abuse)', () => {
      detector.recordLink('u-farmer-1', VALID_KEY_1, '192.168.1.1');

      // Different user attempts to link the exact same key
      const res = detector.evaluate({
        userId: 'u-farmer-2',
        publicKey: VALID_KEY_1,
        clientIp: '192.168.1.1',
      });

      assert.equal(res.allowed, false);
      assert.equal(res.isFlagged, true);
      assert.match(res.reason!, /already been registered by a different account/);
    });

    it('enforces hourly velocity limit per user', () => {
      detector.recordLink('u-rapid-1', VALID_KEY_1);
      detector.recordLink('u-rapid-1', VALID_KEY_2);

      const res = detector.evaluate({
        userId: 'u-rapid-1',
        publicKey: VALID_KEY_3,
      });

      assert.equal(res.allowed, false);
      assert.match(res.reason!, /Exceeded hourly wallet-linking frequency/);
    });
  });
});
