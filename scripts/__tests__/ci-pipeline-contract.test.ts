import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPipelineContract, CI_PIPELINE_CONTRACTS } from '../ci-pipeline-contract.js';

describe('getPipelineContract', () => {
  it('returns contract for backend.yml', () => {
    const c = getPipelineContract('backend.yml');
    assert.ok(c);
    assert.equal(c?.jobs.length, 4);
  });

  it('returns contract for packages.yml', () => {
    const c = getPipelineContract('packages.yml');
    assert.ok(c);
    assert.equal(c?.jobs.length, 3);
  });

  it('returns undefined for unknown file', () => {
    assert.equal(getPipelineContract('unknown.yml'), undefined);
  });
});

describe('CI_PIPELINE_CONTRACTS', () => {
  it('all contracts have required fields', () => {
    for (const c of CI_PIPELINE_CONTRACTS) {
      assert.ok(c.workflowFile);
      assert.ok(c.jobs.length > 0);
      for (const j of c.jobs) {
        assert.ok(j.name);
        assert.ok(Array.isArray(j.steps));
        assert.ok(typeof j.timeoutMinutes === 'number');
        assert.ok(typeof j.required === 'boolean');
      }
    }
  });

  it('all workflow files are .yml', () => {
    for (const c of CI_PIPELINE_CONTRACTS) {
      assert.ok(c.workflowFile.endsWith('.yml'));
    }
  });
});
