import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCiPipelinePhase5Contract, CI_PIPELINE_PHASE5_CONTRACTS, validateCiPipelinePhase5 } from '../ci-pipeline-contract-phase5.js';

describe('getCiPipelinePhase5Contract', () => {
  it('returns contract for backend.yml', () => {
    const c = getCiPipelinePhase5Contract('backend.yml');
    assert.ok(c);
    assert.ok(c?.jobs.length >= 4);
    assert.ok(c?.reproducibility.lockFileRequired);
  });

  it('returns undefined for unknown workflow', () => {
    assert.equal(getCiPipelinePhase5Contract('unknown.yml'), undefined);
  });
});

describe('CI_PIPELINE_PHASE5_CONTRACTS', () => {
  it('all contracts have reproducibility config', () => {
    for (const c of CI_PIPELINE_PHASE5_CONTRACTS) {
      assert.ok(c.workflowFile);
      assert.ok(c.reproducibility.lockFileRequired);
      assert.ok(c.reproducibility.hashVerification);
      assert.ok(c.jobs.length > 0);
    }
  });

  it('all contracts have caching enabled', () => {
    for (const c of CI_PIPELINE_PHASE5_CONTRACTS) {
      assert.ok(c.caching.enabled);
      assert.ok(c.caching.paths.length > 0);
    }
  });

  it('stability config present on all contracts', () => {
    for (const c of CI_PIPELINE_PHASE5_CONTRACTS) {
      assert.ok(typeof c.stability.expectedDuration === 'number');
      assert.ok(typeof c.stability.flakeDetection === 'boolean');
    }
  });
});

describe('validateCiPipelinePhase5', () => {
  it('passes for valid contract', () => {
    const c = getCiPipelinePhase5Contract('backend.yml')!;
    assert.equal(validateCiPipelinePhase5(c).length, 0);
  });

  it('fails if lockfile not required', () => {
    const c = getCiPipelinePhase5Contract('backend.yml')!;
    const broken = { ...c, reproducibility: { ...c.reproducibility, lockFileRequired: false } };
    const errors = validateCiPipelinePhase5(broken);
    assert.ok(errors.some((e) => e.includes('lockFileRequired')));
  });
});
