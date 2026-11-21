import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RewardEligibilityService } from '../../src/eligibility/reward-eligibility.service.js';
import type { QueueIncentiveConfig } from '../../src/eligibility/reward-eligibility.service.js';

describe('Reward Eligibility Check on Queue Join (#1013)', () => {
  let service: RewardEligibilityService;
  const VALID_KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  const ACTIVE_QUEUE_CONFIG: QueueIncentiveConfig = {
    queueId: 'queue-premium-1',
    enabled: true,
    rewardAmount: '5.0000000',
    asset: 'native',
    maxRewardsPerUser: 1,
  };

  beforeEach(() => {
    service = new RewardEligibilityService();
  });

  it('declares user eligible when queue incentives are active and user has linked wallet', () => {
    const result = service.checkEligibility({
      userId: 'user-eligible-1',
      queueId: 'queue-premium-1',
      userWalletPublicKey: VALID_KEY,
      queueConfig: ACTIVE_QUEUE_CONFIG,
    });

    assert.equal(result.eligible, true);
    assert.equal(result.rewardAmount, '5.0000000');
    assert.equal(result.asset, 'native');
  });

  it('rejects eligibility when user has no linked Stellar wallet', () => {
    const result = service.checkEligibility({
      userId: 'user-unlinked-1',
      queueId: 'queue-premium-1',
      userWalletPublicKey: null,
      queueConfig: ACTIVE_QUEUE_CONFIG,
    });

    assert.equal(result.eligible, false);
    assert.match(result.reason!, /must link a verified Stellar wallet/i);
  });

  it('rejects eligibility when user has malformed public key', () => {
    const result = service.checkEligibility({
      userId: 'user-bad-key-1',
      queueId: 'queue-premium-1',
      userWalletPublicKey: 'invalid-key-short',
      queueConfig: ACTIVE_QUEUE_CONFIG,
    });

    assert.equal(result.eligible, false);
    assert.match(result.reason!, /invalid/i);
  });

  it('rejects eligibility when queue does not have incentives enabled', () => {
    const disabledConfig: QueueIncentiveConfig = {
      ...ACTIVE_QUEUE_CONFIG,
      enabled: false,
    };

    const result = service.checkEligibility({
      userId: 'user-1',
      queueId: 'queue-disabled',
      userWalletPublicKey: VALID_KEY,
      queueConfig: disabledConfig,
    });

    assert.equal(result.eligible, false);
    assert.match(result.reason!, /does not have active Stellar incentive/i);
  });

  it('rejects repeat claims exceeding max rewards per user limit', () => {
    const userId = 'user-repeat-1';
    const queueId = 'queue-premium-1';

    // First check is eligible
    const firstCheck = service.checkEligibility({
      userId,
      queueId,
      userWalletPublicKey: VALID_KEY,
      queueConfig: ACTIVE_QUEUE_CONFIG,
    });
    assert.equal(firstCheck.eligible, true);

    // Record claim
    service.recordClaim(userId, queueId);

    // Second check should be rejected
    const secondCheck = service.checkEligibility({
      userId,
      queueId,
      userWalletPublicKey: VALID_KEY,
      queueConfig: ACTIVE_QUEUE_CONFIG,
    });
    assert.equal(secondCheck.eligible, false);
    assert.match(secondCheck.reason!, /limit reached/i);
  });
});
