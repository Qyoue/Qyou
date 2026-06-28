import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCiContractPhase3, validateWorkflowAgainstContract, CI_CONTRACTS_PHASE3 } from '../ci-pipeline-contract-phase3.js';

describe('getCiContractPhase3', () => {
  it('returns contract for backend.yml', () => {
    const c = getCiContractPhase3('backend.yml');
    assert.ok(c);
    assert.equal(c?.rules.length, 5);
  });

  it('returns undefined for unknown file', () => {
    assert.equal(getCiContractPhase3('unknown.yml'), undefined);
  });
});

describe('CI_CONTRACTS_PHASE3', () => {
  it('all contracts define rules', () => {
    for (const c of CI_CONTRACTS_PHASE3) {
      assert.ok(c.workflowFile);
      assert.ok(c.rules.length > 0);
      for (const r of c.rules) {
        assert.ok(r.rule);
        assert.ok(r.description);
        assert.ok(typeof r.required === 'boolean');
      }
    }
  });
});

describe('validateWorkflowAgainstContract', () => {
  it('passes well-formed workflow', () => {
    const content = `name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Install dependencies
        run: npm ci
      - name: Lint
        run: lint
`;
    const contract = getCiContractPhase3('backend.yml')!;
    const result = validateWorkflowAgainstContract(content, contract);
    assert.ok(result.passed.length > 0);
  });

  it('fails when npm install used instead of npm ci', () => {
    const content = `name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Install dependencies
        run: npm install
`;
    const contract = getCiContractPhase3('backend.yml')!;
    const result = validateWorkflowAgainstContract(content, contract);
    assert.ok(result.failed.includes('no-npm-install'));
  });

  it('fails when install after lint', () => {
    const content = `name: Test
on: push
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Lint
        run: lint
      - name: Install dependencies
        run: npm ci
`;
    const contract = getCiContractPhase3('backend.yml')!;
    const result = validateWorkflowAgainstContract(content, contract);
    assert.ok(result.failed.includes('step-order'));
  });
});
