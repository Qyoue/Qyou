import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/qyou_test';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-test-secret-test-secret-32';
process.env.JWT_EXPIRES_IN = '1h';

describe('operator routes auth/role (#1281, #1282)', () => {
  let app: express.Express;

  before(async () => {
    const { registerOperatorRoutes } = await import('../../../routes/operatorRoutes.js');
    const { errorHandler } = await import('../../../shared/middleware/error-handler.js');
    app = express();
    app.use(express.json());
    app.use('/api/v1/operator', registerOperatorRoutes());
    app.use(errorHandler);
  });

  it('rejects unauthenticated calls', async () => {
    const res = await request(app).get('/api/v1/operator/pool/health');
    assert.equal(res.status, 401);
  });

  it('rejects non-operator authenticated calls', async () => {
    const token = jwt.sign(
      { sub: 'u1', email: 'user@example.com', role: 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    const res = await request(app)
      .get('/api/v1/operator/pool/health')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 403);
  });

  it('allows operator role', async () => {
    const token = jwt.sign(
      { sub: 'op1', email: 'op@example.com', role: 'OPERATOR' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    const res = await request(app)
      .get('/api/v1/operator/pool/health')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('allows admin role', async () => {
    const token = jwt.sign(
      { sub: 'a1', email: 'admin@example.com', role: 'ADMIN' },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );
    const res = await request(app)
      .get('/api/v1/operator/pool/config')
      .set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 200);
  });
});
