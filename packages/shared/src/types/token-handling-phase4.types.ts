export interface SlidingSessionOptions {
  slidingWindowMinutes: number;
  absoluteMaxLifetimeHours: number;
  renewBeforeExpirationSeconds: number;
}

export interface RevokedTokenEntry {
  jti: string;
  revokedAt: string;
  reason: 'user_logout' | 'security_revocation' | 'password_change';
}

export interface TokenValidationPhase4Report {
  isTokenActive: boolean;
  requiresRefresh: boolean;
  timeRemainingSeconds: number;
}
