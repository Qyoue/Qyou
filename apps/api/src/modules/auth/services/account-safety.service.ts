import type { AccountLockoutStatus, SafetyPolicyConfig } from '@qyou/shared';

export class AccountSafetyService {
  private readonly config: SafetyPolicyConfig = {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
    requireEmailVerificationOnChange: true,
  };

  public evaluateLockout(attempts: number): AccountLockoutStatus {
    const isLocked = attempts >= this.config.maxFailedAttempts;
    return {
      isLocked,
      attemptsCount: attempts,
      lockoutReason: isLocked ? 'Too many failed login attempts.' : undefined,
    };
  }
}
