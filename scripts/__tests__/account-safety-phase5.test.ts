import { describe, it, expect } from 'vitest';
import { ACCOUNT_SAFETY_PHASE5_CONTRACT, validateAccountSafetyPhase5 } from '../account-safety-contract-phase5';

describe('Account Safety & Shared Auth Contracts Phase 5', () => {
  it('validates Phase 5 account safety contract with zero errors', () => {
    const errors = validateAccountSafetyPhase5(ACCOUNT_SAFETY_PHASE5_CONTRACT);
    expect(errors).toHaveLength(0);
  });

  it('wires package boundary to packages/shared for all flows', () => {
    ACCOUNT_SAFETY_PHASE5_CONTRACT.safetyRules.forEach((rule) => {
      expect(rule.packageBoundary).toBe('packages/shared');
    });
  });
});
