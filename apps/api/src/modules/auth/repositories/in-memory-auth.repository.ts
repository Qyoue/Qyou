import { randomUUID } from 'node:crypto';
import type { AuthRepository } from './auth.repository.js';
import type { AuthUserRecord, CreateUserData } from '../types/auth.types.js';

/**
 * In-memory implementation of {@link AuthRepository}, used by tests so the
 * auth module can be exercised without a running database.
 */
export class InMemoryAuthRepository implements AuthRepository {
  private readonly usersByEmail = new Map<string, AuthUserRecord>();

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.usersByEmail.get(email) ?? null;
  }

  async create(data: CreateUserData): Promise<AuthUserRecord> {
    const now = new Date();
    const record: AuthUserRecord = {
      id: randomUUID(),
      email: data.email,
      passwordHash: data.passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    this.usersByEmail.set(record.email, record);
    return record;
  }
}
