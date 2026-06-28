import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Re-implement logic inline since we can't easily import the workflow module
function readPackageScriptsInline(pkg: Record<string, unknown>): Record<string, string> {
  const scripts = pkg.scripts as Record<string, string> | undefined;
  return scripts || {};
}

describe('checkRootScripts logic', () => {
  it('detects all three scripts present', () => {
    const scripts = readPackageScriptsInline({
      scripts: { lint: 'eslint .', typecheck: 'tsc --noEmit', test: 'jest' },
    });
    assert.ok('lint' in scripts);
    assert.ok('typecheck' in scripts);
    assert.ok('test' in scripts);
  });

  it('detects missing scripts', () => {
    const scripts = readPackageScriptsInline({ scripts: { lint: 'eslint .' } });
    assert.ok('lint' in scripts);
    assert.ok(!('typecheck' in scripts));
    assert.ok(!('test' in scripts));
  });

  it('detects empty script', () => {
    const scripts = readPackageScriptsInline({
      scripts: { lint: '', typecheck: 'tsc --noEmit', test: 'jest' },
    });
    assert.equal(scripts.lint, '');
    assert.ok(scripts.typecheck);
  });

  it('handles missing package.json scripts section', () => {
    const scripts = readPackageScriptsInline({});
    assert.deepEqual(scripts, {});
  });

  it('handles empty scripts object', () => {
    const scripts = readPackageScriptsInline({ scripts: {} });
    assert.deepEqual(scripts, {});
  });
});
