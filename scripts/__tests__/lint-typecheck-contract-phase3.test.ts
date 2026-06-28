import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPhase3Contract, PHASE3_CONTRACTS } from '../lint-typecheck-contract-phase3.js';

describe('getPhase3Contract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getPhase3Contract('@qyou/api');
    assert.ok(c);
    assert.ok(c?.expectedEslintRules.length > 0);
    assert.equal(c?.ciTimeout, 10);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getPhase3Contract('@qyou/unknown'), undefined);
  });
});

describe('PHASE3_CONTRACTS', () => {
  it('all contracts have type check settings', () => {
    for (const c of PHASE3_CONTRACTS) {
      assert.ok(c.workspace);
      assert.ok(c.expectedEslintRules.length >= 0);
      assert.ok(typeof c.expectedTypeCheckSettings.strictNullChecks === 'boolean');
      assert.ok(c.ciTimeout > 0);
    }
  });

  it('api uses node:test framework', () => {
    const api = PHASE3_CONTRACTS.find((c) => c.workspace === '@qyou/api');
    assert.equal(api?.testFramework, 'node:test');
    assert.ok(api?.testMatch.includes('src/**/*.test.ts'));
  });

  it('web and mobile use jest', () => {
    const web = PHASE3_CONTRACTS.find((c) => c.workspace === '@qyou/web');
    assert.equal(web?.testFramework, 'jest');
    const mobile = PHASE3_CONTRACTS.find((c) => c.workspace === '@qyou/mobile');
    assert.equal(mobile?.testFramework, 'jest');
  });

  it('shared packages have no test framework', () => {
    const shared = PHASE3_CONTRACTS.find((c) => c.workspace === '@qyou/shared');
    assert.equal(shared?.testFramework, 'none');
  });

  it('all contracts use strictNullChecks', () => {
    for (const c of PHASE3_CONTRACTS) {
      assert.equal(c.expectedTypeCheckSettings.strictNullChecks, true);
    }
  });
});
