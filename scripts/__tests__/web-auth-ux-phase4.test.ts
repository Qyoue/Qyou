import { describe, it, expect } from 'vitest';
import { WEB_AUTH_UX_PHASE4_CONTRACT, validateWebAuthUxPhase4 } from '../web-auth-ux-contract-phase4';

describe('Web Auth UX Phase 4 Contract Test', () => {
  it('validates phase 4 web auth contract correctly', () => {
    const errors = validateWebAuthUxPhase4(WEB_AUTH_UX_PHASE4_CONTRACT);
    expect(errors).toHaveLength(0);
  });

  it('contains expected e2e target scenarios', () => {
    expect(WEB_AUTH_UX_PHASE4_CONTRACT.e2eCoverage.targetScenarios).toContain('login state restore');
    expect(WEB_AUTH_UX_PHASE4_CONTRACT.e2eCoverage.minPassRate).toBe(100);
  });
});
