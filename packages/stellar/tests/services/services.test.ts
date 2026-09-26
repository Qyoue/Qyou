import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IncentiveService, WalletService } from '../../src/index.js';

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
    assert.equal(unlinked, true);
    assert.equal(walletService.getWallet(userId), null);
  });
});
