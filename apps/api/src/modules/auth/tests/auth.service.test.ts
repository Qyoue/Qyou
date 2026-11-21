import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { AuthService } from '../services/auth.service.js';
import { InMemoryAuthRepository } from '../repositories/in-memory-auth.repository.js';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(new InMemoryAuthRepository());
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

  describe('audit log (#1295)', () => {
    it('records login success and failure events', async () => {
      await authService.register({ email: 'audit@example.com', password: 'password123' });
      await authService.login({ email: 'audit@example.com', password: 'password123' });
      await authService.login({ email: 'audit@example.com', password: 'wrong-pass' }).catch(() => {});

      const entries = authService.getAuditLog().list({ email: 'audit@example.com' });
      assert.ok(entries.some((e) => e.type === 'AUTH_LOGIN_SUCCESS'));
      assert.ok(entries.some((e) => e.type === 'AUTH_LOGIN_FAILURE'));
    });

    it('applies retention policy pruning', () => {
      const audit = authService.getAuditLog();
      audit.record({ type: 'AUTH_LOGIN_FAILURE', email: 'old@example.com' });
      (audit as any).entries[0].timestamp = new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString();
      const pruned = audit.prune();
      assert.ok(pruned >= 1);
    });
  });
});
