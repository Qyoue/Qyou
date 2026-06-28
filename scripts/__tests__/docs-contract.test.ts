import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDocContract, validateDocContents, DOC_CONTRACTS } from '../docs-contract.js';

describe('getDocContract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getDocContract('@qyou/api');
    assert.ok(c);
    assert.equal(c?.requirements.length, 4);
  });

  it('returns contract for @qyou/web', () => {
    const c = getDocContract('@qyou/web');
    assert.ok(c);
    assert.ok(c?.requirements.some((r) => r.file === 'development.md'));
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getDocContract('@qyou/unknown'), undefined);
  });
});

describe('DOC_CONTRACTS', () => {
  it('all contracts define requirements', () => {
    for (const c of DOC_CONTRACTS) {
      assert.ok(c.workspace);
      assert.ok(c.docsDir);
      assert.ok(c.requirements.length > 0);
      for (const r of c.requirements) {
        assert.ok(r.file);
        assert.ok(typeof r.required === 'boolean');
        assert.ok(r.minSize > 0);
        assert.ok(Array.isArray(r.sections));
      }
    }
  });
});

describe('validateDocContents', () => {
  it('passes when content meets requirements', () => {
    const result = validateDocContents(
      '# Setup\nSetup instructions\n# Configuration\nConfig details\n# Running\nRun instructions',
      { file: 'test.md', required: true, minSize: 50, sections: ['Setup', 'Configuration', 'Running'] },
    );
    assert.equal(result.valid, true);
  });

  it('fails when content is too short', () => {
    const result = validateDocContents(
      'short',
      { file: 'test.md', required: true, minSize: 100, sections: [] },
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes('too short'));
  });

  it('fails when section is missing', () => {
    const content = '# Setup\nSetup instructions';
    const result = validateDocContents(content, {
      file: 'test.md', required: true, minSize: 10, sections: ['Setup', 'Deployment'],
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors[0].includes('Deployment'));
  });
});
