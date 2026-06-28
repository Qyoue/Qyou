import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDocsPhase3Contract, DOCS_PHASE3_CONTRACTS } from '../docs-contract-phase3.js';

describe('getDocsPhase3Contract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getDocsPhase3Contract('@qyou/api');
    assert.ok(c);
    assert.equal(c?.files.length, 4);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getDocsPhase3Contract('@qyou/unknown'), undefined);
  });
});

describe('DOCS_PHASE3_CONTRACTS', () => {
  it('all contracts define files with sections', () => {
    for (const c of DOCS_PHASE3_CONTRACTS) {
      assert.ok(c.workspace);
      assert.ok(c.files.length > 0);
      assert.ok(typeof c.maxOrphanedFiles === 'number');
      for (const f of c.files) {
        assert.ok(f.filename);
        assert.ok(typeof f.required === 'boolean');
        assert.ok(f.minChars > 0);
        assert.ok(Array.isArray(f.sections));
      }
    }
  });

  it('api requires deployment.md as optional', () => {
    const api = DOCS_PHASE3_CONTRACTS.find((c) => c.workspace === '@qyou/api');
    const deploy = api?.files.find((f) => f.filename === 'deployment.md');
    assert.equal(deploy?.required, false);
  });

  it('all required docs have sections', () => {
    for (const c of DOCS_PHASE3_CONTRACTS) {
      for (const f of c.files) {
        if (f.required) {
          assert.ok(f.sections.length > 0, `${c.workspace} ${f.filename} should have sections`);
        }
      }
    }
  });
});
