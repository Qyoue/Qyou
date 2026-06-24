import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { WalletLinkService, WalletLinkConflictError, WalletLinkValidationError } from '../services/wallet-link.service.js';
import { InMemoryWalletLinkStore } from '../stores/in-memory-wallet-link.store.js';

// Known valid Stellar public keys (base32, A-Z2-7, starting with G)
const ADDR_A = 'GDMTNN7YSVYXIASIQGQNHBQXSTZRWPBHB2ZWANYLH5QVBHGBXNQPWSZ';
const ADDR_B = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';

describe('WalletLinkService', () => {
  let service: WalletLinkService;

  beforeEach(() => {
    service = new WalletLinkService(new InMemoryWalletLinkStore());
  });

  describe('initiate', () => {
    it('returns a requestId, challenge, and expiresAt for valid input', async () => {
      const result = await service.initiate({ userId: 'user-1', stellarAddress: ADDR_A });

      assert.ok(result.requestId, 'requestId should be set');
      assert.ok(result.challenge, 'challenge should be set');
      assert.ok(result.expiresAt > new Date(), 'expiresAt should be in the future');
    });

    it('generates a 64-character hex challenge', async () => {
      const result = await service.initiate({ userId: 'user-2', stellarAddress: ADDR_A });
      assert.match(result.challenge, /^[0-9a-f]{64}$/);
    });

    it('rejects an empty userId', async () => {
      await assert.rejects(
        () => service.initiate({ userId: '', stellarAddress: ADDR_A }),
        WalletLinkValidationError,
      );
    });

    it('rejects a whitespace-only userId', async () => {
      await assert.rejects(
        () => service.initiate({ userId: '   ', stellarAddress: ADDR_A }),
        WalletLinkValidationError,
      );
    });

    it('rejects an invalid Stellar address', async () => {
      await assert.rejects(
        () => service.initiate({ userId: 'user-3', stellarAddress: 'not-a-stellar-key' }),
        WalletLinkValidationError,
      );
    });

    it('rejects a second pending request for the same user (race/abuse guard)', async () => {
      await service.initiate({ userId: 'user-4', stellarAddress: ADDR_A });

      await assert.rejects(
        () => service.initiate({ userId: 'user-4', stellarAddress: ADDR_B }),
        WalletLinkConflictError,
      );
    });

    it('rejects if the Stellar address already has a pending request (replay guard)', async () => {
      await service.initiate({ userId: 'user-5', stellarAddress: ADDR_A });

      await assert.rejects(
        () => service.initiate({ userId: 'user-6', stellarAddress: ADDR_A }),
        WalletLinkConflictError,
      );
    });

    it('generates unique challenges per request', async () => {
      const r1 = await service.initiate({ userId: 'user-7', stellarAddress: ADDR_A });
      const r2 = await service.initiate({ userId: 'user-8', stellarAddress: ADDR_B });

      assert.notEqual(r1.challenge, r2.challenge, 'each challenge must be unique');
    });
  });
});
