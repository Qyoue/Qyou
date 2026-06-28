import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface LintTypeCheckPhase1Validation {
  hasLintScript: boolean;
  hasTypecheckScript: boolean;
  hasTestScript: boolean;
  lintEmpty: boolean;
  typecheckEmpty: boolean;
  testEmpty: boolean;
}

function validateWorkspaceScripts(pkg: Record<string, unknown>): LintTypeCheckPhase1Validation {
  const scripts: Record<string, string> = (pkg.scripts as Record<string, string>) || {};
  return {
    hasLintScript: 'lint' in scripts,
    hasTypecheckScript: 'typecheck' in scripts,
    hasTestScript: 'test' in scripts,
    lintEmpty: 'lint' in scripts && !scripts.lint.trim(),
    typecheckEmpty: 'typecheck' in scripts && !scripts.typecheck.trim(),
    testEmpty: 'test' in scripts && !scripts.test.trim(),
  };
}

describe('validateWorkspaceScripts', () => {
  it('detects all three scripts present', () => {
    const result = validateWorkspaceScripts({
      scripts: { lint: 'eslint .', typecheck: 'tsc --noEmit', test: 'jest' },
    });
    assert.equal(result.hasLintScript, true);
    assert.equal(result.hasTypecheckScript, true);
    assert.equal(result.hasTestScript, true);
    assert.equal(result.lintEmpty, false);
  });

  it('detects missing scripts', () => {
    const result = validateWorkspaceScripts({ scripts: { lint: 'eslint .' } });
    assert.equal(result.hasTypecheckScript, false);
    assert.equal(result.hasTestScript, false);
  });

  it('detects empty scripts', () => {
    const result = validateWorkspaceScripts({
      scripts: { lint: '', typecheck: '', test: '' },
    });
    assert.equal(result.lintEmpty, true);
    assert.equal(result.typecheckEmpty, true);
    assert.equal(result.testEmpty, true);
  });

  it('handles missing scripts section', () => {
    const result = validateWorkspaceScripts({});
    assert.equal(result.hasLintScript, false);
    assert.equal(result.hasTypecheckScript, false);
    assert.equal(result.hasTestScript, false);
  });
});
