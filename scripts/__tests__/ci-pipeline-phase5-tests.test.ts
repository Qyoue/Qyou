import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCiPipelinePhase5Contract, CI_PIPELINE_PHASE5_CONTRACTS, validateCiPipelinePhase5 } from '../ci-pipeline-contract-phase5.js';

describe('CI Pipeline Phase 5 Tests', () => {
  it('getCiPipelinePhase5Contract returns backend contract', () => {
    const c = getCiPipelinePhase5Contract('backend.yml');
    assert.ok(c);
    assert.ok(c!.jobs.length >= 4);
  });

  it('getCiPipelinePhase5Contract returns undefined for unknown', () => {
    assert.equal(getCiPipelinePhase5Contract('unknown.yml'), undefined);
  });

  it('all contracts have reproducibility config', () => {
    for (const c of CI_PIPELINE_PHASE5_CONTRACTS) {
      assert.ok(c.reproducibility.lockFileRequired);
      assert.ok(c.reproducibility.hashVerification);
      assert.ok(c.reproducibility.nodeVersion);
      assert.ok(c.reproducibility.osImage);
    }
  });

  it('all contracts have caching enabled', () => {
    for (const c of CI_PIPELINE_PHASE5_CONTRACTS) {
      assert.ok(c.caching.enabled);
      assert.ok(c.caching.paths.length > 0);
      assert.ok(c.caching.keyStrategy);
    }
  });

  it('all contracts have stability config', () => {
    for (const c of CI_PIPELINE_PHASE5_CONTRACTS) {
      assert.ok(typeof c.stability.expectedDuration === 'number');
      assert.ok(typeof c.stability.flakeDetection === 'boolean');
      assert.ok(c.stability.maxRetriesPerJob >= 0);
    }
  });

  it('all jobs have runners specified', () => {
    for (const c of CI_PIPELINE_PHASE5_CONTRACTS) {
      for (const job of c.jobs) {
        assert.ok(job.runner);
        assert.ok(job.timeoutMinutes > 0);
      }
    }
  });

  it('validateCiPipelinePhase5 passes for backend.yml', () => {
    const c = getCiPipelinePhase5Contract('backend.yml')!;
    assert.equal(validateCiPipelinePhase5(c).length, 0);
  });

  it('validateCiPipelinePhase5 fails without lockfile', () => {
    const c = getCiPipelinePhase5Contract('backend.yml')!;
    const broken = { ...c, reproducibility: { ...c.reproducibility, lockFileRequired: false } };
    assert.ok(validateCiPipelinePhase5(broken).some(e => e.includes('lockFileRequired')));
  });
});
