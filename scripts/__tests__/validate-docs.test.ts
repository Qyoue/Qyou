import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, writeFileSync, mkdirSync, rmdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { validateDocsForWorkspace } from '../validate-docs.js';

describe('validateDocsForWorkspace', () => {
  it('reports missing when docs directory does not exist', () => {
    const result = validateDocsForWorkspace('/nonexistent', 'test-pkg');
    assert.equal(result.hasDocsDir, false);
    assert.deepEqual(result.missing, ['development.md', 'architecture.md', 'testing.md']);
  });

  it('reports all missing when docs dir is empty', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docstest-'));
    mkdirSync(join(dir, 'docs'));
    const result = validateDocsForWorkspace(dir, 'test-pkg');
    assert.equal(result.hasDocsDir, true);
    assert.deepEqual(result.missing, ['development.md', 'architecture.md', 'testing.md']);
    rmSync(dir, { recursive: true });
  });

  it('passes when all required docs exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docstest-'));
    const docsDir = join(dir, 'docs');
    mkdirSync(docsDir);
    writeFileSync(join(docsDir, 'development.md'), '');
    writeFileSync(join(docsDir, 'architecture.md'), '');
    writeFileSync(join(docsDir, 'testing.md'), '');
    const result = validateDocsForWorkspace(dir, 'test-pkg');
    assert.deepEqual(result.missing, []);
    assert.equal(result.present.length, 3);
    rmSync(dir, { recursive: true });
  });

  it('detects optional deployment.md', () => {
    const dir = mkdtempSync(join(tmpdir(), 'docstest-'));
    const docsDir = join(dir, 'docs');
    mkdirSync(docsDir);
    writeFileSync(join(docsDir, 'development.md'), '');
    writeFileSync(join(docsDir, 'architecture.md'), '');
    writeFileSync(join(docsDir, 'testing.md'), '');
    writeFileSync(join(docsDir, 'deployment.md'), '');
    const result = validateDocsForWorkspace(dir, 'test-pkg');
    assert.deepEqual(result.missing, []);
    assert.deepEqual(result.optionalPresent, ['deployment.md']);
    assert.deepEqual(result.optionalMissing, []);
    rmSync(dir, { recursive: true });
  });
});
