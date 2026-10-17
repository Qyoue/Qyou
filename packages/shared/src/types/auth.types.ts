export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface SessionLifecyclePayload {
  sessionId: string;
  userId: string;
  issuedAt: number;
  expiresAt: number;
  isValid: boolean;
}

export interface TokenRefreshInput {
  refreshToken: string;
}

export interface TokenRefreshResponse {
  tokens: AuthTokens;
}

export type SessionStatus = 'active' | 'expired' | 'revoked';

export interface SessionState {
  user: AuthUser | null;
  status: SessionStatus;
  lastActiveAt?: string;
}

