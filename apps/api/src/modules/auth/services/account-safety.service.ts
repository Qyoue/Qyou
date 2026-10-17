import type { AccountLockoutStatus, SafetyPolicyConfig } from '@qyou/shared';

/**
 * AccountSafetyService boundary (#810).
 *
 * Responsibilities:
 * - Evaluate account lockout status from failed-login attempt counts.
 * - Centralize safety-policy configuration (thresholds, lockout duration).
 *
 * This service SHOULD NOT perform authentication or JWT issuance — that belongs
 * to `AuthService`. It is consumed by `AuthService` / the auth flow to gate
 * logins against the active safety policy.
 */
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
