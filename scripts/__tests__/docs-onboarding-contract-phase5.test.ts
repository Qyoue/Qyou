import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDocsOnboardingPhase5Contract, DOCS_ONBOARDING_PHASE5_CONTRACTS, validateDocsPhase5Contract } from '../docs-onboarding-contract-phase5.js';

describe('getDocsOnboardingPhase5Contract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getDocsOnboardingPhase5Contract('@qyou/api');
    assert.ok(c);
    assert.equal(c?.files.length, 5);
    assert.ok(c?.onboarding.steps.length >= 3);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getDocsOnboardingPhase5Contract('@qyou/unknown'), undefined);
  });
});

describe('DOCS_ONBOARDING_PHASE5_CONTRACTS', () => {
  it('all contracts have onboarding steps', () => {
    for (const c of DOCS_ONBOARDING_PHASE5_CONTRACTS) {
      assert.ok(c.workspace);
      assert.ok(c.onboarding.steps.length > 0);
      assert.ok(c.onboarding.estimatedTotalMinutes > 0);
      assert.ok(typeof c.coverage.targetPercentage === 'number');
    }
  });

  it('api contract includes api-reference doc', () => {
    const api = DOCS_ONBOARDING_PHASE5_CONTRACTS.find((c) => c.workspace === '@qyou/api');
    assert.ok(api?.files.some((f) => f.filename === 'api-reference.md'));
  });

  it('all contracts have no maxOrphanedFiles', () => {
    for (const c of DOCS_ONBOARDING_PHASE5_CONTRACTS) {
      assert.equal(c.maxOrphanedFiles, 0);
    }
  });
});

describe('validateDocsPhase5Contract', () => {
  it('passes for valid contract', () => {
    const api = getDocsOnboardingPhase5Contract('@qyou/api')!;
    const errors = validateDocsPhase5Contract(api);
    assert.equal(errors.length, 0);
  });

  it('fails if insufficient files', () => {
    const c = getDocsOnboardingPhase5Contract('@qyou/api')!;
    const broken = { ...c, files: c.files.slice(0, 1), coverage: { ...c.coverage, minimumFilesPerWorkspace: 5 } };
    const errors = validateDocsPhase5Contract(broken);
    assert.ok(errors.length > 0);
  });
});
