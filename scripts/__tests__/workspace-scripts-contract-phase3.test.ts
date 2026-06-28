import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPhase3Contract, validateBuildOrder, PHASE3_CONTRACTS } from '../workspace-scripts-contract-phase3.js';

describe('getPhase3Contract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getPhase3Contract('@qyou/api');
    assert.ok(c);
    assert.ok(c?.scripts.length > 0);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getPhase3Contract('@qyou/unknown'), undefined);
  });
});

describe('validateBuildOrder', () => {
  it('passes when shared builds before consumers', () => {
    const result = validateBuildOrder(['@qyou/api', '@qyou/shared']);
    assert.equal(result.valid, true);
  });
});

describe('PHASE3_CONTRACTS', () => {
  it('shared has lowest build order', () => {
    const shared = PHASE3_CONTRACTS.find((c) => c.workspace === '@qyou/shared');
    assert.ok(shared);
    const mobile = PHASE3_CONTRACTS.find((c) => c.workspace === '@qyou/mobile');
    assert.ok(mobile);
    assert.ok(shared.buildOrder < mobile.buildOrder);
  });

  it('all contracts have workspace name', () => {
    for (const c of PHASE3_CONTRACTS) {
      assert.ok(c.workspace);
      assert.ok(c.scripts.length > 0);
      assert.ok(typeof c.buildOrder === 'number');
    }
  });

  it('api depends on shared', () => {
    const api = PHASE3_CONTRACTS.find((c) => c.workspace === '@qyou/api');
    assert.ok(api?.scripts.some((s) => s.dependsOn.includes('@qyou/shared')));
  });
});
