export interface EmailVerificationTokenPayload {
  userId: string;
  newEmail: string;
  token: string;
  expiresAt: number;
}

export interface PasswordAuditTrail {
  userId: string;
  lastChangedAt: string;
  mustChangePassword: boolean;
  historyHashCount: number;
}

export interface AccountSafetyThresholds {
  maxFailedLoginsBeforeCaptcha: number;
  maxFailedLoginsBeforeLock: number;
  lockoutWindowMinutes: number;
}
