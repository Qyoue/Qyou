import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getContractForWorkspace, validateScriptBoundary, SCRIPT_CONTRACTS } from '../workspace-boundary-contract.js';

describe('getContractForWorkspace', () => {
  it('returns build+lint+test for @qyou/api', () => {
    const c = getContractForWorkspace('@qyou/api');
    const scripts = c.map((s) => s.script);
    assert.ok(scripts.includes('build'));
    assert.ok(scripts.includes('lint'));
    assert.ok(scripts.includes('test'));
  });

  it('returns no test contract for @qyou/shared', () => {
    const c = getContractForWorkspace('@qyou/shared');
    assert.ok(!c.some((s) => s.script === 'test'));
  });

  it('returns empty for unknown workspace', () => {
    assert.deepEqual(getContractForWorkspace('@qyou/unknown'), []);
  });
});

describe('SCRIPT_CONTRACTS', () => {
  it('every contract has required fields', () => {
    for (const c of SCRIPT_CONTRACTS) {
      assert.ok(c.script);
      assert.ok(c.description);
      assert.ok(Array.isArray(c.workspaces));
      assert.ok(Array.isArray(c.dependencies));
    }
  });
});

describe('validateScriptBoundary', () => {
  it('passes when all required scripts declared', () => {
    const result = validateScriptBoundary('@qyou/api', ['build', 'lint', 'test']);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('fails when required script missing', () => {
    const result = validateScriptBoundary('@qyou/api', ['lint']);
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes('build'));
  });
});
