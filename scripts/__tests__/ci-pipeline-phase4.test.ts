import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getCiPipelinePhase4Contract, CI_PIPELINE_PHASE4_CONTRACTS, validateCiPipelinePhase4Contract } from '../ci-pipeline-contract-phase4.js';

describe('getCiPipelinePhase4Contract', () => {
  it('returns contract for backend.yml', () => {
    const c = getCiPipelinePhase4Contract('backend.yml');
    assert.ok(c);
    assert.equal(c?.workflowFile, 'backend.yml');
  });

  it('returns contract for web.yml', () => {
    const c = getCiPipelinePhase4Contract('web.yml');
    assert.ok(c);
  });

  it('returns undefined for unknown workflow', () => {
    assert.equal(getCiPipelinePhase4Contract('unknown.yml'), undefined);
  });
});

describe('CI_PIPELINE_PHASE4_CONTRACTS', () => {
  it('has all four workflow contracts', () => {
    const workflows = ['backend.yml', 'web.yml', 'mobile.yml', 'packages.yml'];
    for (const wf of workflows) {
      assert.ok(CI_PIPELINE_PHASE4_CONTRACTS.some((c) => c.workflowFile === wf), `Missing contract for ${wf}`);
    }
  });

  it('all contracts have jobs defined', () => {
    for (const c of CI_PIPELINE_PHASE4_CONTRACTS) {
      assert.ok(c.jobs.length > 0, `${c.workflowFile} has no jobs`);
    }
  });

  it('all contracts enable caching', () => {
    for (const c of CI_PIPELINE_PHASE4_CONTRACTS) {
      assert.ok(c.caching, `${c.workflowFile} must have caching enabled`);
    }
  });

  it('all contracts require lock file', () => {
    for (const c of CI_PIPELINE_PHASE4_CONTRACTS) {
      assert.ok(c.lockFileRequired, `${c.workflowFile} must require lock file`);
    }
  });

  it('all contracts use Node 20.x', () => {
    for (const c of CI_PIPELINE_PHASE4_CONTRACTS) {
      assert.equal(c.nodeVersion, '20.x', `${c.workflowFile} should use Node 20.x`);
    }
  });
});

describe('validateCiPipelinePhase4Contract', () => {
  it('passes for valid contract', () => {
    const backend = getCiPipelinePhase4Contract('backend.yml')!;
    assert.equal(validateCiPipelinePhase4Contract(backend).length, 0);
  });

  it('fails if lockFileRequired is false', () => {
    const c = getCiPipelinePhase4Contract('backend.yml')!;
    const broken = { ...c, lockFileRequired: false };
    const errors = validateCiPipelinePhase4Contract(broken);
    assert.ok(errors.some((e) => e.includes('lock file')));
  });

  it('fails if caching is disabled', () => {
    const c = getCiPipelinePhase4Contract('backend.yml')!;
    const broken = { ...c, caching: false };
    const errors = validateCiPipelinePhase4Contract(broken);
    assert.ok(errors.some((e) => e.includes('caching')));
  });
});
