import { describe, it, expect } from 'vitest';
import { SESSION_LIFECYCLE_PHASE5_CONTRACT, validateSessionLifecyclePhase5 } from '../session-lifecycle-contract-phase5';

describe('Session Lifecycle & Token Handling Phase 5', () => {
  it('validates Phase 5 session contract without errors', () => {
    const errors = validateSessionLifecyclePhase5(SESSION_LIFECYCLE_PHASE5_CONTRACT);
    expect(errors).toHaveLength(0);
  });

  it('verifies responsibility split across shared, api, and web', () => {
    expect(SESSION_LIFECYCLE_PHASE5_CONTRACT.responsibilitySplit.sharedPackage).toContain('Zod schema definitions');
    expect(SESSION_LIFECYCLE_PHASE5_CONTRACT.responsibilitySplit.apiApp).toContain('Token signing');
    expect(SESSION_LIFECYCLE_PHASE5_CONTRACT.responsibilitySplit.webApp).toContain('Automatic refresh interceptor');
  });
});
