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
});
