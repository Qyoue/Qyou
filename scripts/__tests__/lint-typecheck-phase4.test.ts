import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPhase4LintContract, PHASE4_LINT_CONTRACTS, validatePhase4LintContract } from '../lint-typecheck-contract-phase4.js';

describe('getPhase4LintContract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getPhase4LintContract('@qyou/api');
    assert.ok(c);
    assert.equal(c?.workspace, '@qyou/api');
  });

  it('returns contract for @qyou/web', () => {
    const c = getPhase4LintContract('@qyou/web');
    assert.ok(c);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getPhase4LintContract('@qyou/unknown'), undefined);
  });
});

describe('PHASE4_LINT_CONTRACTS', () => {
  it('has all five workspace contracts', () => {
    const workspaces = ['@qyou/api', '@qyou/web', '@qyou/mobile', '@qyou/shared', '@qyou/stellar'];
    for (const ws of workspaces) {
      assert.ok(PHASE4_LINT_CONTRACTS.some((c) => c.workspace === ws), `Missing contract for ${ws}`);
    }
  });

  it('all contracts have strict mode enabled', () => {
    for (const c of PHASE4_LINT_CONTRACTS) {
      assert.ok(c.strictMode, `${c.workspace} must have strict mode`);
    }
  });

  it('all contracts have CI timeout >= 5', () => {
    for (const c of PHASE4_LINT_CONTRACTS) {
      assert.ok(c.ciTimeout >= 5, `${c.workspace} CI timeout must be >= 5`);
    }
  });

  it('api has both lint and typecheck pre-commit hooks', () => {
    const api = PHASE4_LINT_CONTRACTS.find((c) => c.workspace === '@qyou/api')!;
    assert.ok(api.preCommit.lint);
    assert.ok(api.preCommit.typecheck);
  });
});

describe('validatePhase4LintContract', () => {
  it('passes for valid contract', () => {
    const api = getPhase4LintContract('@qyou/api')!;
    assert.equal(validatePhase4LintContract(api).length, 0);
  });

  it('fails if strict mode is disabled', () => {
    const c = getPhase4LintContract('@qyou/api')!;
    const broken = { ...c, strictMode: false };
    const errors = validatePhase4LintContract(broken);
    assert.ok(errors.some((e) => e.includes('strict mode')));
  });

  it('fails if CI timeout < 5', () => {
    const c = getPhase4LintContract('@qyou/api')!;
    const broken = { ...c, ciTimeout: 3 };
    const errors = validatePhase4LintContract(broken);
    assert.ok(errors.some((e) => e.includes('CI timeout')));
  });
});
