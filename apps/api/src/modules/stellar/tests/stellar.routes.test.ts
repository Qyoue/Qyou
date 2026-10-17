// Pre-set environment variables before any module loads
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
const JWT_SECRET = 'test-jwt-secret-key-at-least-32-chars-long!';
process.env.JWT_SECRET = process.env.JWT_SECRET || JWT_SECRET;
process.env.STELLAR_INCENTIVES_ENABLED = 'true';

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import { createStellarRouter } from '../routes/stellar.routes.js';
import { InMemoryStellarRepository } from '../repositories/stellar.repository.js';
import { StellarApiService } from '../services/stellar.service.js';
import { WalletService } from '@qyou/stellar';
import { errorHandler } from '../../../shared/middleware/error-handler.js';

function createTestApp(stellarRepository: InMemoryStellarRepository, walletService?: WalletService) {
  const app = express();
  app.use(express.json());

  const stellarService = new StellarApiService(stellarRepository, walletService);
  const router = createStellarRouter({ stellarRepository, stellarService });

  app.use('/api/stellar', router);
  app.use('/api/v1/stellar', router);
  app.use(errorHandler);
  return app;
}

function makeToken(userId: string, email = 'user@example.com'): string {
  return jwt.sign({ sub: userId, email }, process.env.JWT_SECRET || JWT_SECRET);
}

const VALID_KEY_1 = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
const VALID_KEY_2 = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

describe('Stellar Routes (#1006 - #1009)', () => {
  let repository: InMemoryStellarRepository;
  let walletService: WalletService;
  let app: express.Express;

  beforeEach(() => {
    repository = new InMemoryStellarRepository();
    walletService = new WalletService({
      balanceProvider: async () => ({
        xlm: '150.0000000',
        balances: [{ asset: 'native', balance: '150.0000000', isNative: true }],
      }),
    });
    app = createTestApp(repository, walletService);
  });

  describe('Router architecture & feature flag (#1006)', () => {
    it('initializes createStellarRouter with in-memory repository by default', () => {
      const defaultRouter = createStellarRouter();
      assert.ok(defaultRouter);
    });

    it('creates routes adhering to controller/service/repository structure', () => {
      const customRepo = new InMemoryStellarRepository();
      const customService = new StellarApiService(customRepo);
      const router = createStellarRouter({ stellarRepository: customRepo, stellarService: customService });
      assert.ok(router);
    });
  });

  describe('POST /api/stellar/wallet - Link Wallet (#1007)', () => {
    it('successfully links a valid Stellar public key for authenticated user (happy path)', async () => {
      const token = makeToken('user-1');
      const res = await request(app)
        .post('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ publicKey: VALID_KEY_1 });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.wallet.userId, 'user-1');
      assert.equal(res.body.wallet.publicKey, VALID_KEY_1);

      // Verify wallet stored in repository
      const stored = await repository.getWalletByUserId('user-1');
      assert.ok(stored);
      assert.equal(stored.publicKey, VALID_KEY_1);
    });

    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app)
        .post('/api/stellar/wallet')
        .send({ publicKey: VALID_KEY_1 });

      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });

    it('rejects attempt to link a second wallet to an already-linked user with 409 Conflict', async () => {
      const token = makeToken('user-1');
      // Link first wallet
      await request(app)
        .post('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ publicKey: VALID_KEY_1 });

      // Attempt linking second wallet
      const res = await request(app)
        .post('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ publicKey: VALID_KEY_2 });

      assert.equal(res.status, 409);
      assert.equal(res.body.error.code, 'CONFLICT');
      assert.match(res.body.error.message, /already has a linked/);
    });

    it('rejects invalid Stellar public key format with 400 Bad Request', async () => {
      const token = makeToken('user-2');
      const res = await request(app)
        .post('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ publicKey: 'invalid-public-key-short' });

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });
  });

  describe('GET /api/stellar/wallet - Fetch Linked Wallet & Balance (#1008)', () => {
    it('returns linked wallet and cached balances for authenticated user', async () => {
      const token = makeToken('user-3');
      // Pre-link wallet
      await request(app)
        .post('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ publicKey: VALID_KEY_1 });

      const res = await request(app)
        .get('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.wallet.publicKey, VALID_KEY_1);
      assert.ok(res.body.balances);
      assert.equal(res.body.balances.xlm, '150.0000000');
      assert.equal(res.body.balances.publicKey, VALID_KEY_1);
    });

    it('returns 404 Not Found when user has no linked wallet', async () => {
      const token = makeToken('user-no-wallet');
      const res = await request(app)
        .get('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'NOT_FOUND');
    });

    it('rejects unauthenticated request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/stellar/wallet');
      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHORIZED');
    });
  });

  describe('DELETE /api/stellar/wallet - Unlink Wallet with Re-authentication (#1009)', () => {
    it('rejects unlinking when re-authentication is missing with 400 Validation Error', async () => {
      const token = makeToken('user-4');
      await request(app)
        .post('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ publicKey: VALID_KEY_1 });

      const res = await request(app)
        .delete('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('successfully unlinks wallet and writes audit log on re-authentication (happy path)', async () => {
      const token = makeToken('user-5');
      await request(app)
        .post('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ publicKey: VALID_KEY_1 });

      const res = await request(app)
        .delete('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'user-valid-password' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.match(res.body.message, /unlinked successfully/i);

      // Verify wallet deleted from repository
      const wallet = await repository.getWalletByUserId('user-5');
      assert.equal(wallet, null);

      // Verify audit log recorded
      const logs = await repository.getAuditLogs('user-5');
      assert.ok(logs.length >= 1);
      const unlinkLog = logs.find((l) => l.event === 'STELLAR_WALLET_UNLINKED');
      assert.ok(unlinkLog);
      assert.equal(unlinkLog.userId, 'user-5');
      assert.equal(unlinkLog.details.previousPublicKey, VALID_KEY_1);
    });

    it('returns 404 Not Found when trying to unlink non-existent wallet', async () => {
      const token = makeToken('user-no-wallet-to-delete');
      const res = await request(app)
        .delete('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ reauthConfirmed: true });

      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'NOT_FOUND');
    });
  });

  describe('Feature flag gating in main application bootstrap (#1006)', () => {
    it('does not mount stellar endpoints when feature flag is disabled', async () => {
      const { createApp } = await import('../../../app.js');
      const { InMemoryAuthRepository } = await import('../../auth/repositories/in-memory-auth.repository.js');

      const appDisabled = createApp({
        authRepository: new InMemoryAuthRepository(),
        stellarEnabled: false,
      });

      const token = makeToken('user-flag-test');
      const res = await request(appDisabled)
        .post('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ publicKey: VALID_KEY_1 });

      assert.equal(res.status, 404);
    });

    it('mounts stellar endpoints when feature flag is enabled', async () => {
      const { createApp } = await import('../../../app.js');
      const { InMemoryAuthRepository } = await import('../../auth/repositories/in-memory-auth.repository.js');

      const testRepo = new InMemoryStellarRepository();
      const appEnabled = createApp({
        authRepository: new InMemoryAuthRepository(),
        stellarRepository: testRepo,
        stellarEnabled: true,
      });

      const token = makeToken('user-flag-test-2');
      const res = await request(appEnabled)
        .post('/api/stellar/wallet')
        .set('Authorization', `Bearer ${token}`)
        .send({ publicKey: VALID_KEY_1 });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
    });
  });
});
