import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getLintTypecheckTestPhase5Contract, LINT_TYPECHECK_TEST_PHASE5_CONTRACTS, validateLintErgonomicsPhase5 } from '../lint-typecheck-test-contract-phase5.js';

describe('getLintTypecheckTestPhase5Contract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getLintTypecheckTestPhase5Contract('@qyou/api');
    assert.ok(c);
    assert.ok(c?.strictRules.length >= 4);
    assert.ok(c?.preCommit.enabled);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getLintTypecheckTestPhase5Contract('@qyou/unknown'), undefined);
  });
});

describe('LINT_TYPECHECK_TEST_PHASE5_CONTRACTS', () => {
  it('all contracts have pre-commit enabled', () => {
    for (const c of LINT_TYPECHECK_TEST_PHASE5_CONTRACTS) {
      assert.ok(c.workspace);
      assert.ok(c.strictRules.length > 0);
      assert.ok(c.preCommit.hooks.length > 0);
      assert.ok(c.ciIntegration.timeoutMinutes >= 5);
    }
  });

  it('api has both lint and typecheck error rules', () => {
    const api = LINT_TYPECHECK_TEST_PHASE5_CONTRACTS.find((c) => c.workspace === '@qyou/api');
    assert.ok(api?.strictRules.some((r) => r.ruleName === 'strict' && r.requiredSeverity === 'error'));
  });
});

describe('validateLintErgonomicsPhase5', () => {
  it('passes for valid contract', () => {
    const api = getLintTypecheckTestPhase5Contract('@qyou/api')!;
    assert.equal(validateLintErgonomicsPhase5(api).length, 0);
  });

  it('fails if pre-commit disabled', () => {
    const c = getLintTypecheckTestPhase5Contract('@qyou/api')!;
    const broken = { ...c, preCommit: { ...c.preCommit, enabled: false } };
    const errors = validateLintErgonomicsPhase5(broken);
    assert.ok(errors.some((e) => e.includes('pre-commit')));
  });
});
