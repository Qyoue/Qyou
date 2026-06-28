import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getLintTypecheckTestPhase5Contract, LINT_TYPECHECK_TEST_PHASE5_CONTRACTS, validateLintErgonomicsPhase5 } from '../lint-typecheck-test-contract-phase5.js';

describe('Lint/Typecheck Phase 5 Tests', () => {
  it('getLintTypecheckTestPhase5Contract returns api contract', () => {
    const c = getLintTypecheckTestPhase5Contract('@qyou/api');
    assert.ok(c);
    assert.ok(c!.strictRules.length >= 4);
  });

  it('getLintTypecheckTestPhase5Contract returns undefined for unknown', () => {
    assert.equal(getLintTypecheckTestPhase5Contract('@qyou/unknown'), undefined);
  });

  it('all contracts have pre-commit hooks', () => {
    for (const c of LINT_TYPECHECK_TEST_PHASE5_CONTRACTS) {
      assert.ok(c.preCommit.enabled);
      assert.ok(c.preCommit.hooks.length > 0);
      assert.ok(c.preCommit.maxStagedLines > 0);
    }
  });

  it('all contracts have CI integration', () => {
    for (const c of LINT_TYPECHECK_TEST_PHASE5_CONTRACTS) {
      assert.ok(typeof c.ciIntegration.failOnLintError === 'boolean');
      assert.ok(typeof c.ciIntegration.failOnTypeError === 'boolean');
      assert.ok(c.ciIntegration.timeoutMinutes >= 5);
    }
  });

  it('all contracts have test framework config', () => {
    for (const c of LINT_TYPECHECK_TEST_PHASE5_CONTRACTS) {
      assert.ok(c.testFramework.runner);
      assert.ok(typeof c.testFramework.coverageThreshold === 'number');
      assert.ok(c.testFramework.testPattern);
    }
  });

  it('all contracts have IDE recommendations', () => {
    for (const c of LINT_TYPECHECK_TEST_PHASE5_CONTRACTS) {
      assert.ok(c.ide.recommendExtensions.length >= 1);
    }
  });

  it('validateLintErgonomicsPhase5 passes for api', () => {
    const c = getLintTypecheckTestPhase5Contract('@qyou/api')!;
    assert.equal(validateLintErgonomicsPhase5(c).length, 0);
  });

  it('validateLintErgonomicsPhase5 fails without pre-commit', () => {
    const c = getLintTypecheckTestPhase5Contract('@qyou/api')!;
    const broken = { ...c, preCommit: { ...c.preCommit, enabled: false } };
    assert.ok(validateLintErgonomicsPhase5(broken).some(e => e.includes('pre-commit')));
  });
});
