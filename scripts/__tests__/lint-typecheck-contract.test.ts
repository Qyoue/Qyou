import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getLintTypeCheckContract, LINT_TYPECHECK_CONTRACTS } from '../lint-typecheck-contract.js';

describe('getLintTypeCheckContract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getLintTypeCheckContract('@qyou/api');
    assert.ok(c);
    assert.equal(c?.workspace, '@qyou/api');
    assert.ok(c?.eslint.configFile);
    assert.ok(c?.typescript.strict);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getLintTypeCheckContract('@qyou/unknown'), undefined);
  });
});

describe('LINT_TYPECHECK_CONTRACTS', () => {
  it('all contracts define ESLint and TypeScript config', () => {
    for (const c of LINT_TYPECHECK_CONTRACTS) {
      assert.ok(c.workspace);
      assert.ok(c.eslint.configFile);
      assert.ok(Array.isArray(c.eslint.extends));
      assert.ok(typeof c.typescript.strict === 'boolean');
      assert.ok(c.typescript.target);
      assert.ok(c.typescript.module);
    }
  });

  it('all configs use strict TypeScript', () => {
    for (const c of LINT_TYPECHECK_CONTRACTS) {
      assert.equal(c.typescript.strict, true, `${c.workspace} should use strict`);
    }
  });
});
