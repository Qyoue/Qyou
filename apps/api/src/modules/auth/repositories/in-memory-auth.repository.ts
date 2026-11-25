import { randomUUID } from 'node:crypto';
import type { AuthRepository } from './auth.repository.js';
import type {
  AuthActionTokenKind,
  AuthSessionRecord,
  AuthUserRecord,
  CreateUserData,
  RefreshTokenRecord,
} from '../types/auth.types.js';

interface InMemoryActionToken {
  tokenHash: string;
  userId: string;
  kind: AuthActionTokenKind;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

/**
 * In-memory implementation of {@link AuthRepository}, used by tests so the
 * auth module can be exercised without a running database.
 */
export class InMemoryAuthRepository implements AuthRepository {
  private readonly usersByEmail = new Map<string, AuthUserRecord>();
  private readonly sessionsByHash = new Map<string, AuthSessionRecord>();
  private readonly refreshTokensByHash = new Map<string, RefreshTokenRecord>();
  private readonly actionTokensByHash = new Map<string, InMemoryActionToken>();
  private readonly actionRequestsAt = new Map<string, Date>();

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.usersByEmail.get(email) ?? null;
  }

  async findById(id: string): Promise<AuthUserRecord | null> {
    return [...this.usersByEmail.values()].find((user) => user.id === id) ?? null;
  }

  async create(data: CreateUserData): Promise<AuthUserRecord> {
    const now = new Date();
    const record: AuthUserRecord = {
      id: randomUUID(),
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role ?? 'USER',
      emailVerifiedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.usersByEmail.set(record.email, record);
    return record;
  }

  async deactivate(id: string): Promise<AuthUserRecord> {
    const record = [...this.usersByEmail.values()].find((u) => u.id === id);
    if (!record) {
      throw new Error('User not found.');
    }
    record.deactivatedAt = new Date();
    return record;
  }

  async deleteAccount(id: string): Promise<void> {
    const record = [...this.usersByEmail.values()].find((u) => u.id === id);
    if (!record) {
      throw new Error('User not found.');
    }
    this.usersByEmail.delete(record.email);
    for (const [hash, session] of this.sessionsByHash) {
      if (session.userId === id) this.sessionsByHash.delete(hash);
    }
    for (const [hash, token] of this.refreshTokensByHash) {
      if (token.userId === id) this.refreshTokensByHash.delete(hash);
    }
    for (const [hash, token] of this.actionTokensByHash) {
      if (token.userId === id) this.actionTokensByHash.delete(hash);
    }
  }

  async createSession(data: Omit<AuthSessionRecord, 'id' | 'createdAt'>): Promise<void> {
    this.sessionsByHash.set(data.tokenHash, {
      ...data,
      id: randomUUID(),
      createdAt: new Date(),
    });
  }

  async listActiveSessions(userId: string, now: Date): Promise<AuthSessionRecord[]> {
    return [...this.sessionsByHash.values()]
      .filter(
        (session) => session.userId === userId && !session.revokedAt && session.expiresAt > now,
      )
      .sort((left, right) => right.lastUsedAt.getTime() - left.lastUsedAt.getTime());
  }

  async touchSession(tokenHash: string, now: Date): Promise<void> {
    const session = this.sessionsByHash.get(tokenHash);
    if (session && !session.revokedAt && session.expiresAt > now) session.lastUsedAt = now;
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    const session = this.sessionsByHash.get(tokenHash);
    if (session && !session.revokedAt) session.revokedAt = now;
  }

  async createRefreshToken(
    data: Omit<RefreshTokenRecord, 'id' | 'revokedAt' | 'createdAt'>,
  ): Promise<void> {
    this.refreshTokensByHash.set(data.tokenHash, {
      ...data,
      id: randomUUID(),
      revokedAt: null,
      createdAt: new Date(),
    });
  }

  async consumeRefreshToken(
    tokenHash: string,
    now: Date,
  ): Promise<RefreshTokenRecord | null> {
    const token = this.refreshTokensByHash.get(tokenHash);
    if (!token || token.revokedAt || token.expiresAt <= now) return null;
    token.revokedAt = now;
    return token;
  }

  async createActionToken(input: {
    tokenHash: string;
    userId: string;
    kind: AuthActionTokenKind;
    expiresAt: Date;
    createdAt: Date;
    cooldownAfter: Date;
  }): Promise<boolean> {
    const cooldownKey = `${input.userId}:${input.kind}`;
    const lastRequestAt = this.actionRequestsAt.get(cooldownKey);
    if (lastRequestAt && lastRequestAt > input.cooldownAfter) return false;

    for (const token of this.actionTokensByHash.values()) {
      if (token.userId === input.userId && token.kind === input.kind && !token.consumedAt) {
        token.consumedAt = input.createdAt;
      }
    }
    this.actionTokensByHash.set(input.tokenHash, {
      ...input,
      consumedAt: null,
    });
    this.actionRequestsAt.set(cooldownKey, input.createdAt);
    return true;
  }

  async consumeActionToken(
    tokenHash: string,
    kind: AuthActionTokenKind,
    now: Date,
    newPasswordHash?: string,
  ): Promise<boolean> {
    const token = this.actionTokensByHash.get(tokenHash);
    if (!token || token.kind !== kind || token.consumedAt || token.expiresAt <= now) return false;
    const user = [...this.usersByEmail.values()].find((candidate) => candidate.id === token.userId);
    if (!user) return false;
    if (kind === 'PASSWORD_RESET') {
      if (!newPasswordHash) throw new Error('A new password hash is required for password reset.');
      user.passwordHash = newPasswordHash;
    } else {
      user.emailVerifiedAt = now;
    }
    user.updatedAt = now;
    token.consumedAt = now;
    return true;
  }
}
