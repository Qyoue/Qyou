import './helpers/test-env.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { beforeEach, describe, it } from 'node:test';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../../app.js';
import { InMemoryAuthRepository } from '../repositories/in-memory-auth.repository.js';
import type { AuthEmail, Mailer } from '../services/mailer.js';

class CapturingMailer implements Mailer {
  readonly emails: AuthEmail[] = [];

  async send(email: AuthEmail): Promise<void> {
    this.emails.push(email);
  }
}

describe('Auth account actions', () => {
  let app: Express;
  let repository: InMemoryAuthRepository;
  let mailer: CapturingMailer;

  beforeEach(() => {
    repository = new InMemoryAuthRepository();
    mailer = new CapturingMailer();
    app = createApp({ authRepository: repository, mailer });
  });

  it('lists active sessions without returning token material', async () => {
    await request(app)
      .post('/api/auth/register')
      .set('User-Agent', 'Qyou Test Browser')
      .send({ email: 'sessions@example.com', password: 'Password123' })
      .expect(201);
    const login = await request(app)
      .post('/api/auth/login')
      .set('User-Agent', 'Qyou Test Browser')
      .send({ email: 'sessions@example.com', password: 'Password123' })
      .expect(200);
    const accessToken = login.body.tokens.accessToken as string;

    const response = await request(app)
      .get('/api/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    assert.equal(response.body.sessions.length, 2);
    assert.equal(
      response.body.sessions.filter((session: { current: boolean }) => session.current).length,
      1,
    );
    assert.ok(
      response.body.sessions.every(
        (session: Record<string, unknown>) =>
          typeof session.device === 'string' &&
          typeof session.lastUsedAt === 'string' &&
          typeof session.current === 'boolean' &&
          !('token' in session) &&
          !('tokenHash' in session),
      ),
    );
    assert.ok(!response.text.includes(accessToken));
  });

  it('requires authentication to list sessions', async () => {
    await request(app).get('/api/auth/sessions').expect(401);
  });

  it('verifies email using a single-use token and throttles resends', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'verify@example.com', password: 'Password123' })
      .expect(201);

    const resend = () =>
      request(app)
        .post('/api/auth/email-verification/request')
        .send({ email: 'verify@example.com' })
        .expect(200);

    await resend();
    await resend();
    assert.equal(mailer.emails.length, 1);

    const token = new URL(mailer.emails[0].variables.url).searchParams.get('token');
    assert.ok(token);
    await request(app).post('/api/auth/email-verification/confirm').send({ token }).expect(200);
    await request(app).post('/api/auth/email-verification/confirm').send({ token }).expect(400);

    const user = await repository.findByEmail('verify@example.com');
    assert.ok(user?.emailVerifiedAt);
  });

  it('keeps password-reset responses identical and consumes the hashed token once', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'reset@example.com', password: 'Password123' })
      .expect(201);

    const unknown = await request(app)
      .post('/api/auth/password-reset/request')
      .send({ email: 'unknown@example.com' })
      .expect(200);
    const known = await request(app)
      .post('/api/auth/password-reset/request')
      .send({ email: 'reset@example.com' })
      .expect(200);
    assert.deepEqual(known.body, unknown.body);

    const token = new URL(mailer.emails[0].variables.url).searchParams.get('token');
    assert.ok(token);
    await request(app)
      .post('/api/auth/password-reset/confirm')
      .send({ token, password: 'NewPassword123' })
      .expect(200);
    await request(app)
      .post('/api/auth/password-reset/confirm')
      .send({ token, password: 'AnotherPassword123' })
      .expect(400);

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset@example.com', password: 'Password123' })
      .expect(401);
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset@example.com', password: 'NewPassword123' })
      .expect(200);
  });

  it('rejects an expired password-reset token', async () => {
    const user = await repository.create({
      email: 'expired-reset@example.com',
      passwordHash: 'unused-hash',
    });
    const token = 'expired-password-reset-token-with-enough-length-123456';
    const now = new Date();
    await repository.createActionToken({
      tokenHash: createHash('sha256').update(token).digest('hex'),
      userId: user.id,
      kind: 'PASSWORD_RESET',
      expiresAt: new Date(now.getTime() - 1),
      createdAt: now,
      cooldownAfter: new Date(now.getTime() - 60_000),
    });

    await request(app)
      .post('/api/auth/password-reset/confirm')
      .send({ token, password: 'NewPassword123' })
      .expect(400);
  });
});
