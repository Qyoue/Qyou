import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  IncentiveService,
  WalletService,
  InvalidPublicKeyError,
  WalletAlreadyLinkedError,
  WalletNotFoundError,
} from '../../src/index.js';

describe('Stellar Services (#1005)', () => {
  it('constructs IncentiveService and exposes contract client', () => {
    const service = new IncentiveService({
      contractId: 'C1234567890INCENTIVESERVICETEST',
      adminSignerKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU',
    });

    assert.ok(service.getClient());
    assert.equal(service.getClient().contractId, 'C1234567890INCENTIVESERVICETEST');
  });

  it('constructs WalletService and manages account links', () => {
    const walletService = new WalletService();
    const userId = 'user-test-uuid-1';
    const pubKey = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';

    assert.equal(walletService.getWallet(userId), null);

    const linked = walletService.linkWallet(userId, pubKey);
    assert.equal(linked.userId, userId);
    assert.equal(linked.publicKey, pubKey);

    const retrieved = walletService.getWallet(userId);
    assert.ok(retrieved);
    assert.equal(retrieved.publicKey, pubKey);

    const unlinked = walletService.unlinkWallet(userId);
    assert.equal(unlinked.unlinked, true);
    assert.equal(walletService.getWallet(userId), null);
  });

  it('validates public key format and rejects invalid keys', () => {
    const walletService = new WalletService();
    assert.equal(walletService.isValidPublicKey('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU'), true);
    assert.equal(walletService.isValidPublicKey('SBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU'), false);
    assert.equal(walletService.isValidPublicKey('invalid-key'), false);

    assert.throws(
      () => walletService.linkWallet('user-1', 'bad-key'),
      InvalidPublicKeyError,
    );
  });

  it('rejects linking a second wallet to an already-linked user', () => {
    const walletService = new WalletService();
    const userId = 'user-test-uuid-2';
    const pubKey1 = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
    const pubKey2 = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';

    walletService.linkWallet(userId, pubKey1);

    assert.throws(
      () => walletService.linkWallet(userId, pubKey2),
      WalletAlreadyLinkedError,
    );
  });

  it('caches account balances and supports invalidation', async () => {
    let callCount = 0;
    const pubKey = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
    const walletService = new WalletService({
      cacheTtlMs: 5000,
      balanceProvider: async (pk) => {
        callCount++;
        return {
          xlm: '42.5000000',
          balances: [{ asset: 'native', balance: '42.5000000', isNative: true }],
        };
      },
    });

    const b1 = await walletService.getBalances(pubKey);
    assert.equal(callCount, 1);
    assert.equal(b1.fromCache, false);
    assert.equal(b1.xlm, '42.5000000');

    // Second call hit cache
    const b2 = await walletService.getBalances(pubKey);
    assert.equal(callCount, 1);
    assert.equal(b2.fromCache, true);

    // Invalidation forces fresh fetch
    walletService.invalidateBalanceCache(pubKey);
    const b3 = await walletService.getBalances(pubKey);
    assert.equal(callCount, 2);
    assert.equal(b3.fromCache, false);
  });

  it('throws WalletNotFoundError on unlinking non-existent wallet', () => {
    const walletService = new WalletService();
    assert.throws(
      () => walletService.unlinkWallet('non-existent-user'),
      WalletNotFoundError,
    );
  });
});
