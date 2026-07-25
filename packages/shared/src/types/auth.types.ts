export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface AuthContractVersion {
  version: string;
  deprecated: boolean;
  supportedFeatures: string[];
}

export interface SchemaEvolutionConfig {
  schemaVersion: number;
  strictMode: boolean;
  allowLegacyFallback: boolean;
}

export interface PasswordSafetyPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export interface AccountSafetyPayload {
  userId: string;
  lockoutRemainingSeconds?: number;
  failedAttempts: number;
  isLocked: boolean;
}

