import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  IncentivePoolContract,
  ContractUnauthorizedError,
  ContractInsufficientBalanceError,
  ContractInvalidAmountError,
  ContractNotInitializedError,
  ContractAlreadyInitializedError,
} from '../../src/index.js';

describe('IncentivePool Contract Edge Cases (#1002)', () => {
  let pool: IncentivePoolContract;
  const admin = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  const token = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
  const upgradeAdmin = 'GCIWOCBH4SSTQ3552LGTJ6G5L3O5HQ2I2TFWKGWZ567Q23LXZAZ77K65';
  const recipient = 'GDUSERB1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const attacker = 'GDATTACKER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  beforeEach(() => {
    pool = new IncentivePoolContract();
  });

  describe('uninitialized edge cases', () => {
    it('rejects deposit when uninitialized', () => {
      assert.throws(() => {
        pool.deposit({ from: admin, amount: 100n });
      }, ContractNotInitializedError);
    });

    it('rejects distribution when uninitialized', () => {
      assert.throws(() => {
        pool.distribute({
          caller: admin,
          recipient,
          amount: 50n,
          idempotencyKey: 'uninit-tx',
        });
      }, ContractNotInitializedError);
    });

    it('rejects upgrade when uninitialized', () => {
      assert.throws(() => {
        pool.upgrade(upgradeAdmin, 'wasm-hash');
      }, ContractNotInitializedError);
    });
  });

  describe('zero balance & overdraw edge cases', () => {
    beforeEach(() => {
      pool.initialize({ admin, token, upgradeAdmin });
    });

    it('fails to distribute from an empty pool (zero balance)', () => {
      assert.equal(pool.getBalance(), 0n);
      assert.throws(() => {
        pool.distribute({
          caller: admin,
          recipient,
          amount: 1n,
          idempotencyKey: 'zero-balance-attempt',
        });
      }, ContractInsufficientBalanceError);
      assert.equal(pool.getBalance(), 0n);
    });

    it('fails when distribution amount strictly exceeds available balance', () => {
      pool.deposit({ from: admin, amount: 100n });
      assert.throws(() => {
        pool.distribute({
          caller: admin,
          recipient,
          amount: 101n,
          idempotencyKey: 'exceed-by-one',
        });
      }, ContractInsufficientBalanceError);
      assert.equal(pool.getBalance(), 100n);
    });

    it('allows draining exactly to zero balance', () => {
      pool.deposit({ from: admin, amount: 250n });
      const newBal = pool.distribute({
        caller: admin,
        recipient,
        amount: 250n,
        idempotencyKey: 'exact-drain',
      });
      assert.equal(newBal, 0n);
      assert.equal(pool.getBalance(), 0n);
    });
  });

  describe('double distribution & idempotency edge cases', () => {
    beforeEach(() => {
      pool.initialize({ admin, token, upgradeAdmin });
      pool.deposit({ from: admin, amount: 1000n });
    });

    it('prevents double distribution with identical idempotency key', () => {
      const initialBal = pool.getBalance();
      const firstPayout = pool.distribute({
        caller: admin,
        recipient,
        amount: 200n,
        idempotencyKey: 'idemp-double-test',
      });
      assert.equal(firstPayout, initialBal - 200n);

      // Attempt double distribution with same key
      const secondPayout = pool.distribute({
        caller: admin,
        recipient,
        amount: 200n,
        idempotencyKey: 'idemp-double-test',
      });

      // Balance must NOT decrease a second time
      assert.equal(secondPayout, firstPayout);
      assert.equal(pool.getBalance(), 800n);

      // Event log should contain only one distribution event
      const distribEvents = pool.getEvents().filter((e) => e.topic === 'distribute');
      assert.equal(distribEvents.length, 1);
    });

    it('processes multiple distributions with distinct idempotency keys sequentially', () => {
      pool.distribute({ caller: admin, recipient, amount: 100n, idempotencyKey: 'tx-1' });
      pool.distribute({ caller: admin, recipient, amount: 200n, idempotencyKey: 'tx-2' });
      pool.distribute({ caller: admin, recipient, amount: 300n, idempotencyKey: 'tx-3' });

      assert.equal(pool.getBalance(), 400n);
      const events = pool.getEvents().filter((e) => e.topic === 'distribute');
      assert.equal(events.length, 3);
    });
  });

  describe('authorization & boundary edge cases', () => {
    beforeEach(() => {
      pool.initialize({ admin, token, upgradeAdmin });
      pool.deposit({ from: admin, amount: 500n });
    });

    it('rejects distribution from malicious caller even with valid idempotency key', () => {
      assert.throws(() => {
        pool.distribute({
          caller: attacker,
          recipient: attacker,
          amount: 50n,
          idempotencyKey: 'malicious-attempt',
        });
      }, ContractUnauthorizedError);
      assert.equal(pool.getBalance(), 500n);
    });

    it('rejects upgrade from distribution admin key', () => {
      assert.throws(() => {
        pool.upgrade(admin, 'new-wasm-hash');
      }, ContractUnauthorizedError);
    });
  });
});
