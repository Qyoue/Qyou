export interface EmailChangeRequest {
  newEmail: string;
  verificationToken: string;
  requestedAt: string;
}

export interface AccountLockoutStatus {
  isLocked: boolean;
  lockoutReason?: string;
  lockedUntil?: string;
  attemptsCount: number;
}

export interface SafetyPolicyConfig {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  requireEmailVerificationOnChange: boolean;
}
