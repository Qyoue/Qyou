import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  WalletService,
  InvalidPublicKeyError,
  WalletAlreadyLinkedError,
  WalletNotFoundError,
} from '../../src/index.js';

describe('WalletService Comprehensive Unit Tests (#1038)', () => {
  let walletService: WalletService;
  const VALID_KEY_1 = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  const VALID_KEY_2 = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
  const INVALID_KEY = 'INVALID_NOT_A_STELLAR_KEY';

  beforeEach(() => {
    walletService = new WalletService({
      cacheTtlMs: 500,
      balanceProvider: async (pk) => {
        if (pk === VALID_KEY_1) {
          return {
            xlm: '150.5000000',
            balances: [
              { asset: 'native', balance: '150.5000000', isNative: true },
              { asset: 'USDC:G...ISSUER', balance: '25.0000000', isNative: false },
            ],
          };
        }
        return {
          xlm: '0.0000000',
          balances: [{ asset: 'native', balance: '0.0000000', isNative: true }],
        };
      },
    });
  });

  describe('Key Validation & Account Generation', () => {
    it('validates correct Stellar Ed25519 public keys and rejects invalid formats', () => {
      assert.equal(walletService.isValidPublicKey(VALID_KEY_1), true);
      assert.equal(walletService.isValidPublicKey(VALID_KEY_2), true);
      assert.equal(walletService.isValidPublicKey(INVALID_KEY), false);
      assert.equal(walletService.isValidPublicKey(''), false);
      assert.equal(walletService.isValidPublicKey(VALID_KEY_1.substring(0, 50)), false);
    });

    it('generates a fresh valid keypair using createAccount()', () => {
      const account = walletService.createAccount();
      assert.ok(account.publicKey.startsWith('G'));
      assert.equal(account.publicKey.length, 56);
      assert.ok(account.secretKey.startsWith('S'));
      assert.equal(account.secretKey.length, 56);
      assert.equal(walletService.isValidPublicKey(account.publicKey), true);
    });
  });

  describe('Wallet Linking & Unlinking', () => {
    it('links a wallet to a user and retrieves it', () => {
      const linked = walletService.linkWallet('user-101', VALID_KEY_1);
      assert.equal(linked.userId, 'user-101');
      assert.equal(linked.publicKey, VALID_KEY_1);

      const retrieved = walletService.getWallet('user-101');
      assert.ok(retrieved);
      assert.equal(retrieved?.publicKey, VALID_KEY_1);
    });

    it('rejects linking with invalid public key format', () => {
      assert.throws(
        () => walletService.linkWallet('user-invalid', INVALID_KEY),
        (err: Error) => err instanceof InvalidPublicKeyError
      );
    });

    it('rejects linking when user already has a linked wallet', () => {
      walletService.linkWallet('user-dup', VALID_KEY_1);
      assert.throws(
        () => walletService.linkWallet('user-dup', VALID_KEY_2),
        (err: Error) => err instanceof WalletAlreadyLinkedError
      );
    });

    it('unlinks an existing wallet and returns previous account record', () => {
      walletService.linkWallet('user-unlink', VALID_KEY_1);
      const res = walletService.unlinkWallet('user-unlink');
      assert.equal(res.unlinked, true);
      assert.equal(res.previousAccount.publicKey, VALID_KEY_1);
      assert.equal(walletService.getWallet('user-unlink'), null);
    });

    it('throws WalletNotFoundError on unlinking non-linked user', () => {
      assert.throws(
        () => walletService.unlinkWallet('user-nonexistent'),
        (err: Error) => err instanceof WalletNotFoundError
      );
    });
  });

  describe('Balances & Cache Management', () => {
    it('fetches balances using balanceProvider and serves subsequent reads from cache', async () => {
      const initial = await walletService.getBalances(VALID_KEY_1);
      assert.equal(initial.fromCache, false);
      assert.equal(initial.xlm, '150.5000000');
      assert.equal(initial.balances.length, 2);

      const cached = await walletService.getBalances(VALID_KEY_1);
      assert.equal(cached.fromCache, true);
      assert.equal(cached.xlm, '150.5000000');
    });

    it('invalidates cache manually or on forceRefresh', async () => {
      await walletService.getBalances(VALID_KEY_1);
      walletService.invalidateBalanceCache(VALID_KEY_1);

      const refreshed = await walletService.getBalances(VALID_KEY_1);
      assert.equal(refreshed.fromCache, false);

      const forced = await walletService.getBalances(VALID_KEY_1, true);
      assert.equal(forced.fromCache, false);
    });

    it('rejects balance queries for invalid public keys', async () => {
      await assert.rejects(
        async () => walletService.getBalances(INVALID_KEY),
        (err: Error) => err instanceof InvalidPublicKeyError
      );
    });
  });

  describe('Trustline Management', () => {
    it('adds, verifies, and removes custom asset trustlines', async () => {
      assert.equal(await walletService.hasTrustline(VALID_KEY_1, 'USDC'), false);

      const addResult = await walletService.addTrustline({
        publicKey: VALID_KEY_1,
        assetCode: 'USDC',
        issuer: VALID_KEY_2,
        limit: '1000.0',
      });
      assert.equal(addResult.success, true);
      assert.equal(await walletService.hasTrustline(VALID_KEY_1, 'USDC', VALID_KEY_2), true);

      const lines = walletService.getTrustlines(VALID_KEY_1);
      assert.equal(lines.length, 1);
      assert.equal(lines[0], `USDC:${VALID_KEY_2}`);

      const removeResult = await walletService.removeTrustline(VALID_KEY_1, 'USDC', VALID_KEY_2);
      assert.equal(removeResult.success, true);
      assert.equal(await walletService.hasTrustline(VALID_KEY_1, 'USDC', VALID_KEY_2), false);
    });

    it('rejects trustline operations with invalid public key', async () => {
      await assert.rejects(
        async () => walletService.addTrustline({ publicKey: INVALID_KEY, assetCode: 'TEST' }),
        (err: Error) => err instanceof InvalidPublicKeyError
      );
    });
  });
});
