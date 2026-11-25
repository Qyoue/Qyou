import './helpers/test-env.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth.service.js';
import { env } from '../../../shared/config/env.js';
import { InMemoryAuthRepository } from '../repositories/in-memory-auth.repository.js';

describe('AuthService', () => {
  let authService: AuthService;
  let authRepository: InMemoryAuthRepository;

  beforeEach(() => {
    authRepository = new InMemoryAuthRepository();
    authService = new AuthService(authRepository);
  });

  describe('register', () => {
    it('creates a new user and returns an access token', async () => {
      const result = await authService.register({
        email: 'new-user@example.com',
        password: 'password123',
      });

      assert.equal(result.user.email, 'new-user@example.com');
      assert.ok(result.tokens.accessToken);
    });

    it('rejects registration with a duplicate email', async () => {
      await authService.register({ email: 'duplicate@example.com', password: 'password123' });

      await assert.rejects(
        () => authService.register({ email: 'duplicate@example.com', password: 'password123' }),
        /already exists/,
      );
    });
  });

  describe('login', () => {
    it('logs in a user with valid credentials', async () => {
      await authService.register({ email: 'login@example.com', password: 'password123' });

      const result = await authService.login({
        email: 'login@example.com',
        password: 'password123',
      });

      assert.equal(result.user.email, 'login@example.com');
      assert.ok(result.tokens.accessToken);
    });

    it('rejects login with an incorrect password', async () => {
      await authService.register({ email: 'wrong-password@example.com', password: 'password123' });

      await assert.rejects(
        () =>
          authService.login({ email: 'wrong-password@example.com', password: 'incorrect-pass' }),
        /Invalid email or password/,
      );
    });

    it('rejects login for a non-existent account', async () => {
      await assert.rejects(
        () => authService.login({ email: 'missing@example.com', password: 'password123' }),
        /Invalid email or password/,
      );
    });
  });

  describe('refresh (#1263)', () => {
    it('rotates the refresh token and rejects the old one afterwards', async () => {
      const registered = await authService.register({
        email: 'refresh-service@example.com',
        password: 'password123',
      });
      const originalRefreshToken = registered.tokens.refreshToken as string;
      assert.ok(originalRefreshToken);

      const rotated = await authService.refresh({ refreshToken: originalRefreshToken });
      assert.ok(rotated.tokens.accessToken);
      assert.ok(rotated.tokens.refreshToken);
      assert.notEqual(rotated.tokens.refreshToken, originalRefreshToken);

      await assert.rejects(
        () => authService.refresh({ refreshToken: originalRefreshToken }),
        /already been used/,
      );
    });

    it('rejects a malformed refresh token', async () => {
      await assert.rejects(
        () => authService.refresh({ refreshToken: 'not-a-jwt' }),
        /invalid/,
      );
    });

    it('rejects an expired refresh token', async () => {
      const expired = jwt.sign(
        { sub: 'user-id', jti: 'expired', type: 'refresh' },
        env.JWT_SECRET,
        { expiresIn: -1 },
      );
      await assert.rejects(() => authService.refresh({ refreshToken: expired }), /expired/);
    });

    it('rejects a refresh token whose stored record has expired', async () => {
      const registered = await authService.register({
        email: 'expired-record@example.com',
        password: 'password123',
      });
      const payload = jwt.decode(registered.tokens.refreshToken as string) as jwt.JwtPayload;
      const staleToken = jwt.sign(
        { sub: payload.sub, jti: 'stale', type: 'refresh' },
        env.JWT_SECRET,
        { expiresIn: '1h' },
      );
      await authRepository.createRefreshToken({
        tokenHash: createHash('sha256').update(staleToken).digest('hex'),
        userId: payload.sub as string,
        expiresAt: new Date(Date.now() - 1000),
        userAgent: null,
        ip: null,
      });

      await assert.rejects(() => authService.refresh({ refreshToken: staleToken }), /invalid/);
    });
  });

  describe('deactivateAccount', () => {
    it('rejects login for a deactivated account (#798)', async () => {
      const created = await authService.register({ email: 'deact@example.com', password: 'password123' });
      await authService.deactivateAccount(created.user.id);

      await assert.rejects(
        () => authService.login({ email: 'deact@example.com', password: 'password123' }),
        /has been deactivated/,
      );
    });
  });

  describe('deleteAccount (#1296)', () => {
    it('requires re-auth and deletes the account', async () => {
      await authService.register({ email: 'delete@example.com', password: 'password123' });

      await authService.deleteAccount({ email: 'delete@example.com', password: 'password123' });

      await assert.rejects(
        () => authService.login({ email: 'delete@example.com', password: 'password123' }),
        /Invalid email or password/,
      );
    });

    it('rejects deletion with wrong password', async () => {
      await authService.register({ email: 'delete2@example.com', password: 'password123' });

      await assert.rejects(
        () => authService.deleteAccount({ email: 'delete2@example.com', password: 'wrong-pass' }),
        /Invalid email or password/,
      );
    });
  });
});
