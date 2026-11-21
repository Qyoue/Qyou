export interface TokenRotationClaim {
  jti: string;
  sub: string;
  iat: number;
  exp: number;
  rotationCount: number;
}

export interface TokenValidationConfig {
  algorithm: 'HS256' | 'RS256';
  maxTokenLifetimeSeconds: number;
  allowRotatedReuseWindowSeconds: number;
}

export interface TokenValidationOutcome {
  isValid: boolean;
  claims?: TokenRotationClaim;
  failureReason?: string;
}
