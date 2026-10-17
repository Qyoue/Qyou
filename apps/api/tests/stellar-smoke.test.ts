import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createStellarServices } from '../src/shared/stellar/bootstrap.js';

describe('API Stellar Bootstrap Smoke Test (#1005)', () => {
  it('successfully constructs WalletService and IncentiveService at API boot', () => {
    const { walletService, incentiveService } = createStellarServices();
    assert.ok(walletService);
    assert.ok(incentiveService);
    assert.ok(incentiveService.getClient());
  });
});
