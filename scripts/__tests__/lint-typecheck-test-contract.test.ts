import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getContract, validateWorkspaceConfig } from '../lint-typecheck-test-contract.js';

describe('getContract', () => {
  it('returns a contract for @qyou/api', () => {
    const c = getContract('@qyou/api');
    assert.ok(c);
    assert.equal(c?.testFramework, 'node:test');
  });

  it('returns a contract for @qyou/web', () => {
    const c = getContract('@qyou/web');
    assert.ok(c);
    assert.equal(c?.testFramework, 'jest');
  });

  it('returns null for unknown package', () => {
    assert.equal(getContract('@qyou/unknown'), null);
  });

  it('all contracts have required flags', () => {
    for (const name of ['@qyou/api', '@qyou/web', '@qyou/mobile', '@qyou/shared', '@qyou/stellar']) {
      const c = getContract(name);
      assert.ok(c, `${name} should have a contract`);
      assert.equal(c?.hasLintScript, true);
      assert.equal(c?.hasTypeCheckScript, true);
      assert.equal(c?.hasTestScript, true);
    }
  });
});

describe('validateWorkspaceConfig', () => {
  it('passes when scripts match contract', () => {
    const result = validateWorkspaceConfig('@qyou/api', {
      lint: 'eslint .',
      typecheck: 'tsc -p tsconfig.json --noEmit',
      test: 'node --import tsx --test src/modules/auth/tests/*.test.ts',
    });
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('fails on missing scripts', () => {
    const result = validateWorkspaceConfig('@qyou/api', {});
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('lint')));
    assert.ok(result.errors.some((e) => e.includes('typecheck')));
    assert.ok(result.errors.some((e) => e.includes('test')));
  });
});
