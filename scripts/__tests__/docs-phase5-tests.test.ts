import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDocsOnboardingPhase5Contract, DOCS_ONBOARDING_PHASE5_CONTRACTS, validateDocsPhase5Contract } from '../docs-onboarding-contract-phase5.js';

describe('Docs Phase 5 Tests', () => {
  it('getDocsOnboardingPhase5Contract returns api contract', () => {
    const c = getDocsOnboardingPhase5Contract('@qyou/api');
    assert.ok(c);
    assert.equal(c!.files.length, 5);
  });

  it('getDocsOnboardingPhase5Contract returns undefined for unknown', () => {
    assert.equal(getDocsOnboardingPhase5Contract('@qyou/unknown'), undefined);
  });

  it('all contracts have required files', () => {
    for (const c of DOCS_ONBOARDING_PHASE5_CONTRACTS) {
      const required = c.files.filter(f => f.required);
      assert.ok(required.length > 0, `${c.workspace}: no required files`);
    }
  });

  it('all contracts have onboarding steps', () => {
    for (const c of DOCS_ONBOARDING_PHASE5_CONTRACTS) {
      assert.ok(c.onboarding.steps.length > 0);
      assert.ok(c.onboarding.estimatedTotalMinutes > 0);
      assert.ok(c.onboarding.requiredCheckpoints.length > 0);
    }
  });

  it('contracts have section requirements', () => {
    for (const c of DOCS_ONBOARDING_PHASE5_CONTRACTS) {
      for (const f of c.files) {
        assert.ok(f.sections.length >= 2, `${c.workspace}: ${f.filename} needs >=2 sections`);
      }
    }
  });

  it('validateDocsPhase5Contract passes for valid contracts', () => {
    for (const c of DOCS_ONBOARDING_PHASE5_CONTRACTS) {
      assert.equal(validateDocsPhase5Contract(c).length, 0);
    }
  });

  it('validateDocsPhase5Contract catches insufficient files', () => {
    const c = DOCS_ONBOARDING_PHASE5_CONTRACTS[0];
    const broken = { ...c, files: c.files.slice(0, 1), coverage: { ...c.coverage, minimumFilesPerWorkspace: 5 } };
    const errors = validateDocsPhase5Contract(broken);
    assert.ok(errors.length > 0);
  });

  it('coverage targets are at least 80%', () => {
    for (const c of DOCS_ONBOARDING_PHASE5_CONTRACTS) {
      assert.ok(c.coverage.targetPercentage >= 80, `${c.workspace}: target ${c.coverage.targetPercentage}%`);
    }
  });
});
