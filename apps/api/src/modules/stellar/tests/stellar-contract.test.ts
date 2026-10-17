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
import {
  walletResponseSchema,
  unlinkWalletResponseSchema,
  type WalletResponseDto,
  type UnlinkWalletResponseDto,
} from '@qyou/shared';

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

function makeToken(userId: string, email = 'contract-user@example.com'): string {
  return jwt.sign({ sub: userId, email }, process.env.JWT_SECRET || JWT_SECRET);
}

const VALID_KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';

describe('Stellar Route Schema & DTO Contract Verification (#1046)', () => {
  let repository: InMemoryStellarRepository;
  let walletService: WalletService;
  let app: express.Express;

  beforeEach(() => {
    repository = new InMemoryStellarRepository();
    walletService = new WalletService({
      balanceProvider: async () => ({
        xlm: '250.5000000',
        balances: [
          { asset: 'native', balance: '250.5000000', isNative: true },
          { asset: 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', balance: '100.0000000', isNative: false },
        ],
      }),
    });
    app = createTestApp(repository, walletService);
  });

  it('POST /api/stellar/wallet response matches declared @qyou/shared WalletResponseDto', async () => {
    const token = makeToken('contract-user-1');

    const res = await request(app)
      .post('/api/stellar/wallet')
      .set('Authorization', `Bearer ${token}`)
      .send({ publicKey: VALID_KEY });

    assert.equal(res.status, 201);

    // Validate runtime shape against @qyou/shared Zod schema
    const parsed = walletResponseSchema.parse(res.body);
    assert.equal(parsed.success, true);
    assert.equal(parsed.wallet.userId, 'contract-user-1');
    assert.equal(parsed.wallet.publicKey, VALID_KEY);
    assert.ok(typeof parsed.wallet.createdAt === 'number');

    // TypeScript compile-time shape assignment check
    const dto: WalletResponseDto = res.body;
    assert.equal(dto.wallet.publicKey, VALID_KEY);
  });

  it('GET /api/stellar/wallet response matches declared @qyou/shared WalletResponseDto with balances', async () => {
    const token = makeToken('contract-user-2');

    // Link first
    await request(app)
      .post('/api/stellar/wallet')
      .set('Authorization', `Bearer ${token}`)
      .send({ publicKey: VALID_KEY });

    // Fetch
    const res = await request(app)
      .get('/api/stellar/wallet')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(res.status, 200);

    // Validate runtime shape against @qyou/shared Zod schema
    const parsed = walletResponseSchema.parse(res.body);
    assert.equal(parsed.success, true);
    assert.equal(parsed.wallet.userId, 'contract-user-2');
    assert.ok(parsed.balances);
    assert.equal(parsed.balances?.publicKey, VALID_KEY);
    assert.equal(parsed.balances?.xlm, '250.5000000');
    assert.equal(parsed.balances?.balances.length, 2);
    assert.equal(parsed.balances?.balances[0].isNative, true);
    assert.equal(parsed.balances?.balances[1].isNative, false);

    // Compile-time assignment check
    const dto: WalletResponseDto = res.body;
    assert.equal(dto.balances?.xlm, '250.5000000');
  });

  it('DELETE /api/stellar/wallet response matches declared @qyou/shared UnlinkWalletResponseDto', async () => {
    const token = makeToken('contract-user-3');

    // Link first
    await request(app)
      .post('/api/stellar/wallet')
      .set('Authorization', `Bearer ${token}`)
      .send({ publicKey: VALID_KEY });

    // Unlink
    const res = await request(app)
      .delete('/api/stellar/wallet')
      .set('Authorization', `Bearer ${token}`)
      .send({ reauthConfirmed: true });

    assert.equal(res.status, 200);

    // Validate runtime shape against @qyou/shared Zod schema
    const parsed = unlinkWalletResponseSchema.parse(res.body);
    assert.equal(parsed.success, true);
    assert.ok(typeof parsed.message === 'string');
    assert.ok(typeof parsed.unlinkedAt === 'number');

    // Compile-time assignment check
    const dto: UnlinkWalletResponseDto = res.body;
    assert.equal(dto.success, true);
  });

  it('v1 routes (/api/v1/stellar/wallet) adhere to the identical schema contract', async () => {
    const token = makeToken('contract-user-4');

    const postRes = await request(app)
      .post('/api/v1/stellar/wallet')
      .set('Authorization', `Bearer ${token}`)
      .send({ publicKey: VALID_KEY });

    assert.equal(postRes.status, 201);
    const postParsed = walletResponseSchema.parse(postRes.body);
    assert.equal(postParsed.success, true);

    const getRes = await request(app)
      .get('/api/v1/stellar/wallet')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(getRes.status, 200);
    const getParsed = walletResponseSchema.parse(getRes.body);
    assert.equal(getParsed.success, true);
    assert.ok(getParsed.balances);
  });
});
