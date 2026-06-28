import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDocContractPhase1, validateDocsPhase1, DOCS_CONTRACTS_PHASE1 } from '../docs-contract-phase1.js';

describe('getDocContractPhase1', () => {
  it('returns contract for @qyou/api', () => {
    const c = getDocContractPhase1('@qyou/api');
    assert.ok(c);
    assert.equal(c?.requiredDocs.length, 3);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getDocContractPhase1('@qyou/unknown'), undefined);
  });
});

describe('DOCS_CONTRACTS_PHASE1', () => {
  it('all contracts define workspace and docs', () => {
    for (const c of DOCS_CONTRACTS_PHASE1) {
      assert.ok(c.workspace);
      assert.ok(c.directory);
      assert.ok(c.requiredDocs.length > 0);
    }
  });
});

describe('validateDocsPhase1', () => {
  it('passes when all required docs exist', () => {
    const contract = getDocContractPhase1('@qyou/api')!;
    const result = validateDocsPhase1(['development.md', 'architecture.md', 'testing.md'], contract);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('fails when required doc missing', () => {
    const contract = getDocContractPhase1('@qyou/api')!;
    const result = validateDocsPhase1(['development.md'], contract);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('architecture')));
  });

  it('warns on missing optional doc', () => {
    const contract = getDocContractPhase1('@qyou/api')!;
    const result = validateDocsPhase1(['development.md', 'architecture.md', 'testing.md'], contract);
    assert.ok(result.warnings.some((w) => w.includes('deployment')));
  });
});
