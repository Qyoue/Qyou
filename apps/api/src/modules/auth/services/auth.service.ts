import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  TokenRefreshInput,
  TokenRefreshResponse,
} from '@qyou/shared';
import { env } from '../../../shared/config/env.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../../../shared/errors/index.js';
import type { AuthRepository } from '../repositories/auth.repository.js';
import type { AuthActionTokenKind, AuthUserRecord } from '../types/auth.types.js';
import { AccountSafetyService } from './account-safety.service.js';
import { AuthAuditService } from './auth-audit.service.js';
import { createMailer, type Mailer } from './mailer.js';
import { logger } from '../../../shared/logger/index.js';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const EMAIL_ACTION_COOLDOWN_MS = 60 * 1000;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface AuthRequestContext {
  userAgent?: string | null;
  ip?: string | null;
}

export interface PublicAuthSession {
  id: string;
  device: string;
  lastUsedAt: string;
  current: boolean;
}

interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
}

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
    private readonly mailer: Mailer = createMailer(),
  ) {}

  async register(input: RegisterInput, context: AuthRequestContext = {}): Promise<AuthResponse> {
    const existing = await this.authRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email already exists.');
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    const user = await this.authRepository.create({ email: input.email, passwordHash });
    this.audit.record({ type: 'AUTH_REGISTER', email: user.email, userId: user.id });
    return this.toAuthResponse(user, context);
  }

  async login(input: LoginInput, context: AuthRequestContext = {}): Promise<AuthResponse> {
    // #804: reject logins once the account exceeds the failed-attempt threshold.
    const status = this.accountSafety.evaluateLockout(this.failedAttempts.get(input.email) ?? 0);
    if (status.isLocked) {
      this.audit.record({
        type: 'AUTH_LOGIN_FAILURE',
        email: input.email,
        metadata: { reason: 'locked' },
      });
      throw new UnauthorizedError(status.lockoutReason ?? 'Account is temporarily locked.');
    }

    const user = await this.authRepository.findByEmail(input.email);
    if (!user) {
      this.audit.record({
        type: 'AUTH_LOGIN_FAILURE',
        email: input.email,
        metadata: { reason: 'not_found' },
      });
      throw new UnauthorizedError('Invalid email or password.');
    }

    if (user.deactivatedAt) {
      this.audit.record({
        type: 'AUTH_LOGIN_FAILURE',
        email: input.email,
        userId: user.id,
        metadata: { reason: 'deactivated' },
      });
      throw new UnauthorizedError('This account has been deactivated.');
    }

    const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValidPassword) {
      this.failedAttempts.set(input.email, (this.failedAttempts.get(input.email) ?? 0) + 1);
      this.audit.record({
        type: 'AUTH_LOGIN_FAILURE',
        email: input.email,
        userId: user.id,
        metadata: { reason: 'invalid_password' },
      });
      throw new UnauthorizedError('Invalid email or password.');
    }

    this.failedAttempts.delete(input.email);
    this.audit.record({ type: 'AUTH_LOGIN_SUCCESS', email: user.email, userId: user.id });
    return this.toAuthResponse(user, context);
  }

  /**
   * #1263: exchange a refresh token for a new token pair. The presented token is
   * consumed (revoked) before new tokens are issued, so replaying it fails.
   */
  async refresh(
    input: TokenRefreshInput,
    context: AuthRequestContext = {},
  ): Promise<TokenRefreshResponse> {
    let payload: RefreshTokenPayload;
    try {
      payload = jwt.verify(input.refreshToken, env.JWT_SECRET) as RefreshTokenPayload;
    } catch (error) {
      this.audit.record({
        type: 'AUTH_REFRESH_FAILURE',
        metadata: { reason: error instanceof jwt.TokenExpiredError ? 'expired' : 'invalid' },
      });
      throw new UnauthorizedError(
        error instanceof jwt.TokenExpiredError
          ? 'The refresh token has expired.'
          : 'The refresh token is invalid.',
      );
    }

    if (
      payload.type !== 'refresh' ||
      typeof payload.sub !== 'string' ||
      typeof payload.jti !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      this.audit.record({ type: 'AUTH_REFRESH_FAILURE', metadata: { reason: 'invalid' } });
      throw new UnauthorizedError('The refresh token is invalid.');
    }

    const consumed = await this.authRepository.consumeRefreshToken(
      this.hashToken(input.refreshToken),
      new Date(),
    );
    if (!consumed || consumed.userId !== payload.sub) {
      this.audit.record({
        type: 'AUTH_REFRESH_FAILURE',
        userId: payload.sub,
        metadata: { reason: consumed ? 'mismatched_user' : 'reused_or_revoked' },
      });
      throw new UnauthorizedError('The refresh token is invalid or has already been used.');
    }

    const user = await this.authRepository.findById(consumed.userId);
    if (!user || user.deactivatedAt) {
      this.audit.record({
        type: 'AUTH_REFRESH_FAILURE',
        userId: consumed.userId,
        metadata: { reason: user ? 'deactivated' : 'not_found' },
      });
      throw new UnauthorizedError('The account is no longer active.');
    }

    const result = await this.toAuthResponse(user, context);
    this.audit.record({ type: 'AUTH_REFRESH_SUCCESS', email: user.email, userId: user.id });
    return { tokens: result.tokens };
  }

  async requestEmailVerification(email: string): Promise<void> {
    const user = await this.authRepository.findByEmail(email.trim().toLowerCase());
    if (!user || user.emailVerifiedAt) return;
    await this.sendActionToken(user, 'EMAIL_VERIFICATION');
  }

  async confirmEmailVerification(token: string): Promise<void> {
    const confirmed = await this.authRepository.consumeActionToken(
      this.hashToken(token),
      'EMAIL_VERIFICATION',
      new Date(),
    );
    if (!confirmed) throw new ValidationError('The verification link is invalid or expired.');
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.authRepository.findByEmail(email.trim().toLowerCase());
    if (!user) return;
    await this.sendActionToken(user, 'PASSWORD_RESET');
  }

  async confirmPasswordReset(token: string, password: string): Promise<void> {
    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
    const reset = await this.authRepository.consumeActionToken(
      this.hashToken(token),
      'PASSWORD_RESET',
      new Date(),
      passwordHash,
    );
    if (!reset) throw new ValidationError('The password reset link is invalid or expired.');
  }

  async listSessions(userId: string, accessToken: string): Promise<PublicAuthSession[]> {
    const now = new Date();
    const tokenHash = this.hashToken(accessToken);
    await this.authRepository.touchSession(tokenHash, now);
    const sessions = await this.authRepository.listActiveSessions(userId, now);
    return sessions.map((session) => ({
      id: session.id,
      device: session.userAgent || 'Unknown device',
      lastUsedAt: session.lastUsedAt.toISOString(),
      current: session.tokenHash === tokenHash,
    }));
  }

  async revokeSession(accessToken: string | undefined): Promise<void> {
    if (accessToken)
      await this.authRepository.revokeSession(this.hashToken(accessToken), new Date());
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

  private async toAuthResponse(
    user: AuthUserRecord,
    context: AuthRequestContext,
  ): Promise<AuthResponse> {
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
      },
    );
    const payload = jwt.decode(accessToken);
    if (!payload || typeof payload === 'string' || typeof payload.exp !== 'number') {
      throw new Error('The issued access token has no expiration.');
    }

    const refreshToken = jwt.sign(
      {
        sub: user.id,
        jti: randomBytes(16).toString('hex'),
        type: 'refresh',
      },
      env.JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_TTL_SECONDS },
    );
    const refreshPayload = jwt.decode(refreshToken);
    if (
      !refreshPayload ||
      typeof refreshPayload === 'string' ||
      typeof refreshPayload.exp !== 'number'
    ) {
      throw new Error('The issued refresh token has no expiration.');
    }

    const now = new Date();
    await this.authRepository.createSession({
      userId: user.id,
      tokenHash: this.hashToken(accessToken),
      expiresAt: new Date(payload.exp * 1000),
      revokedAt: null,
      userAgent: context.userAgent?.slice(0, 512) ?? null,
      ip: context.ip?.slice(0, 64) ?? null,
      lastUsedAt: now,
    });
    await this.authRepository.createRefreshToken({
      tokenHash: this.hashToken(refreshToken),
      userId: user.id,
      expiresAt: new Date(refreshPayload.exp * 1000),
      userAgent: context.userAgent?.slice(0, 512) ?? null,
      ip: context.ip?.slice(0, 64) ?? null,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: payload.exp - Math.floor(now.getTime() / 1000),
      },
    };
  }

  private async sendActionToken(user: AuthUserRecord, kind: AuthActionTokenKind): Promise<void> {
    const now = new Date();
    const token = randomBytes(32).toString('hex');
    const isEmailVerification = kind === 'EMAIL_VERIFICATION';
    const stored = await this.authRepository.createActionToken({
      tokenHash: this.hashToken(token),
      userId: user.id,
      kind,
      expiresAt: new Date(
        now.getTime() + (isEmailVerification ? EMAIL_VERIFICATION_TTL_MS : PASSWORD_RESET_TTL_MS),
      ),
      createdAt: now,
      cooldownAfter: new Date(now.getTime() - EMAIL_ACTION_COOLDOWN_MS),
    });
    if (!stored) return;

    const url = new URL(
      isEmailVerification ? '/verify-email' : '/forgot-password',
      env.WEB_BASE_URL,
    );
    url.searchParams.set('token', token);
    try {
      await this.mailer.send({
        to: user.email,
        subject: isEmailVerification ? 'Verify your Qyou email' : 'Reset your Qyou password',
        template: isEmailVerification ? 'email-verification' : 'password-reset',
        variables: { url: url.toString() },
      });
    } catch (error) {
      logger.error('Failed to send an authentication email', error);
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
