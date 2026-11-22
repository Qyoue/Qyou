import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AuthResponse, LoginInput, RegisterInput } from '@qyou/shared';
import { env } from '../../../shared/config/env.js';
import { ConflictError, UnauthorizedError } from '../../../shared/errors/index.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import type { AuthUserRecord } from '../types/auth.types.js';
import { AccountSafetyService } from './account-safety.service.js';
import { AuthAuditService } from './auth-audit.service.js';

/**
 * AuthService boundary (#810).
 *
 * Responsibilities:
 * - Register and authenticate users (password hashing + JWT issuance).
 * - Owns the canonical `AuthUserRecord` → `AuthResponse` mapping.
 *
 * This service SHOULD NOT contain account-safety policy (lockout thresholds,
 * email-change rules) — those live in `AccountSafetyService`. It also does not
 * validate request shape; that is the validators' job before the service is hit.
 */
export class AuthService {
  private readonly accountSafety = new AccountSafetyService();
  private readonly failedAttempts = new Map<string, number>();

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly audit = new AuthAuditService(),
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const existing = await this.authRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    const user = await this.authRepository.create({ email: input.email, passwordHash });
    this.audit.record({ type: 'AUTH_REGISTER', email: user.email, userId: user.id });
    return this.toAuthResponse(user);
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    // #804: reject logins once the account exceeds the failed-attempt threshold.
    const status = this.accountSafety.evaluateLockout(this.failedAttempts.get(input.email) ?? 0);
    if (status.isLocked) {
      this.audit.record({ type: 'AUTH_LOGIN_FAILURE', email: input.email, metadata: { reason: 'locked' } });
      throw new UnauthorizedError(status.lockoutReason ?? 'Account is temporarily locked.');
    }

    const user = await this.authRepository.findByEmail(input.email);
    if (!user) {
      this.audit.record({ type: 'AUTH_LOGIN_FAILURE', email: input.email, metadata: { reason: 'not_found' } });
      throw new UnauthorizedError('Invalid email or password.');
    }

    if (user.deactivatedAt) {
      this.audit.record({ type: 'AUTH_LOGIN_FAILURE', email: input.email, userId: user.id, metadata: { reason: 'deactivated' } });
      throw new UnauthorizedError('This account has been deactivated.');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      this.failedAttempts.set(input.email, (this.failedAttempts.get(input.email) ?? 0) + 1);
      this.audit.record({ type: 'AUTH_LOGIN_FAILURE', email: input.email, userId: user.id, metadata: { reason: 'invalid_password' } });
      throw new UnauthorizedError('Invalid email or password.');
    }

    this.failedAttempts.delete(input.email);
    this.audit.record({ type: 'AUTH_LOGIN_SUCCESS', email: user.email, userId: user.id });
    return this.toAuthResponse(user);
  }

  async deactivateAccount(id: string): Promise<void> {
    await this.authRepository.deactivate(id);
  }

  async deleteAccount(input: LoginInput): Promise<void> {
    const user = await this.authRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    await this.authRepository.deleteAccount(user.id);
  }

  private toAuthResponse(user: AuthUserRecord): AuthResponse {
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
      },
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      tokens: { accessToken },
    };
  }
}
