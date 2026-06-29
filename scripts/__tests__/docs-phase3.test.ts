import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPhase3Contract } from '../docs-contract-phase3.js';

describe('Docs Phase 3 Contract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getPhase3Contract('@qyou/api');
    assert.ok(c);
    assert.ok(c?.files);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getPhase3Contract('@qyou/unknown'), undefined);
  });
});

describe('Docs Phase 3 Hardening', () => {
  it('verifies hardening module loads', () => {
    assert.doesNotThrow(() => {
      require('../docs-hardening-phase3.js');
    });
  });
});
