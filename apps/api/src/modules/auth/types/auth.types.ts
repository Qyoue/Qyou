export type UserRole = 'USER' | 'OPERATOR' | 'ADMIN';

export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  emailVerifiedAt?: Date | null;
  deactivatedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ip: string | null;
  lastUsedAt: Date;
  createdAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
}

export type AuthActionTokenKind = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
