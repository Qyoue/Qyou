import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDocsOnboardingPhase4Contract, DOCS_ONBOARDING_PHASE4_CONTRACTS, validateDocsOnboardingPhase4Contract } from '../docs-onboarding-contract-phase4.js';

describe('getDocsOnboardingPhase4Contract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getDocsOnboardingPhase4Contract('@qyou/api');
    assert.ok(c);
    assert.equal(c?.files.length, 5);
  });

  it('returns contract for @qyou/web', () => {
    const c = getDocsOnboardingPhase4Contract('@qyou/web');
    assert.ok(c);
    assert.equal(c?.files.length, 4);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getDocsOnboardingPhase4Contract('@qyou/unknown'), undefined);
  });
});

describe('DOCS_ONBOARDING_PHASE4_CONTRACTS', () => {
  it('all five workspaces have contracts', () => {
    const workspaces = ['@qyou/api', '@qyou/web', '@qyou/mobile', '@qyou/shared', '@qyou/stellar'];
    for (const ws of workspaces) {
      assert.ok(DOCS_ONBOARDING_PHASE4_CONTRACTS.some((c) => c.workspace === ws), `Missing contract for ${ws}`);
    }
  });

  it('all contracts have onboarding steps', () => {
    for (const c of DOCS_ONBOARDING_PHASE4_CONTRACTS) {
      assert.ok(c.onboardingSteps.length > 0, `${c.workspace} has no onboarding steps`);
    }
  });

  it('all contracts have coverage target >= 50', () => {
    for (const c of DOCS_ONBOARDING_PHASE4_CONTRACTS) {
      assert.ok(c.coverageTarget >= 50, `${c.workspace} coverage target must be >= 50`);
    }
  });

  it('api contract includes api-reference.md', () => {
    const api = DOCS_ONBOARDING_PHASE4_CONTRACTS.find((c) => c.workspace === '@qyou/api')!;
    assert.ok(api.files.some((f) => f.filename === 'api-reference.md'));
  });
});

describe('validateDocsOnboardingPhase4Contract', () => {
  it('passes for valid contract', () => {
    const api = getDocsOnboardingPhase4Contract('@qyou/api')!;
    assert.equal(validateDocsOnboardingPhase4Contract(api).length, 0);
  });

  it('fails if no files defined', () => {
    const c = getDocsOnboardingPhase4Contract('@qyou/api')!;
    const broken = { ...c, files: [] };
    const errors = validateDocsOnboardingPhase4Contract(broken);
    assert.ok(errors.some((e) => e.includes('no files defined')));
  });

  it('fails if insufficient onboarding steps', () => {
    const c = getDocsOnboardingPhase4Contract('@qyou/shared')!;
    const broken = { ...c, onboardingSteps: [{ description: 'Build', command: 'npm run build', estimatedMinutes: 1 }] };
    const errors = validateDocsOnboardingPhase4Contract(broken);
    assert.ok(errors.some((e) => e.includes('onboarding steps')));
  });
});
