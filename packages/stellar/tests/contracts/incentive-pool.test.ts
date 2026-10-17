import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  IncentivePoolContract,
  ContractUnauthorizedError,
  ContractInsufficientBalanceError,
  ContractInvalidAmountError,
  ContractAlreadyInitializedError,
  ContractNotInitializedError,
} from '../../src/contracts/incentive-pool.js';

describe('IncentivePoolContract', () => {
  let pool: IncentivePoolContract;
  const admin = 'GDADMINKEY1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const token = 'CDTOKENKEY1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const upgradeAdmin = 'GDUPGRADEKEY1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const userA = 'GDUSERA1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const attacker = 'GDATTACKER1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  beforeEach(() => {
    pool = new IncentivePoolContract();
  });

  describe('initialization', () => {
    it('initializes successfully with admin, token, and upgradeAdmin', () => {
      pool.initialize({ admin, token, upgradeAdmin });
      assert.equal(pool.getAdmin(), admin);
      assert.equal(pool.getUpgradeAdmin(), upgradeAdmin);
      assert.equal(pool.getBalance(), 0n);
    });

    it('rejects double initialization', () => {
      pool.initialize({ admin, token, upgradeAdmin });
      assert.throws(() => {
        pool.initialize({ admin, token, upgradeAdmin });
      }, ContractAlreadyInitializedError);
    });

    it('throws if called before initialization', () => {
      assert.throws(() => {
        pool.getBalance();
      }, ContractNotInitializedError);
      assert.throws(() => {
        pool.getAdmin();
      }, ContractNotInitializedError);
    });
  });

  describe('deposit (#994)', () => {
    beforeEach(() => {
      pool.initialize({ admin, token, upgradeAdmin });
    });

    it('deposits funds and increases the pool balance', () => {
      const newBalance = pool.deposit({ from: admin, amount: 500n });
      assert.equal(newBalance, 500n);
      assert.equal(pool.getBalance(), 500n);

      pool.deposit({ from: userA, amount: 250n });
      assert.equal(pool.getBalance(), 750n);

      const events = pool.getEvents();
      assert.equal(events.length, 2);
      assert.equal(events[0].topic, 'deposit');
      assert.equal(events[0].data.amount, '500');
    });

    it('rejects deposit with zero or negative amount', () => {
      assert.throws(() => {
        pool.deposit({ from: admin, amount: 0n });
      }, ContractInvalidAmountError);

      assert.throws(() => {
        pool.deposit({ from: admin, amount: -10n });
      }, ContractInvalidAmountError);
    });
  });

  describe('distribute (#995 & #996)', () => {
    beforeEach(() => {
      pool.initialize({ admin, token, upgradeAdmin });
      pool.deposit({ from: admin, amount: 1000n });
    });

    it('allows designated admin to distribute rewards to a recipient', () => {
      const newBalance = pool.distribute({
        caller: admin,
        recipient: userA,
        amount: 150n,
        idempotencyKey: 'idemp-tx-001',
      });

      assert.equal(newBalance, 850n);
      assert.equal(pool.getBalance(), 850n);

      const events = pool.getEvents().filter((e) => e.topic === 'distribute');
      assert.equal(events.length, 1);
      assert.equal(events[0].data.recipient, userA);
      assert.equal(events[0].data.amount, '150');
      assert.equal(events[0].data.idempotencyKey, 'idemp-tx-001');
    });

    it('rejects distribution when caller is not the admin (#996)', () => {
      assert.throws(() => {
        pool.distribute({
          caller: attacker,
          recipient: attacker,
          amount: 100n,
          idempotencyKey: 'attacker-key',
        });
      }, ContractUnauthorizedError);

      // Verify balance was unaffected
      assert.equal(pool.getBalance(), 1000n);
    });

    it('rejects distribution if amount exceeds pool balance', () => {
      assert.throws(() => {
        pool.distribute({
          caller: admin,
          recipient: userA,
          amount: 5000n,
          idempotencyKey: 'excessive-payout',
        });
      }, ContractInsufficientBalanceError);
    });

    it('rejects distribution with invalid amount', () => {
      assert.throws(() => {
        pool.distribute({
          caller: admin,
          recipient: userA,
          amount: 0n,
          idempotencyKey: 'zero-amount',
        });
      }, ContractInvalidAmountError);
    });

    it('handles idempotent duplicate distribution without duplicate deduction', () => {
      pool.distribute({
        caller: admin,
        recipient: userA,
        amount: 100n,
        idempotencyKey: 'idempotent-repeat',
      });
      assert.equal(pool.getBalance(), 900n);

      // Repeat with same idempotency key
      const repeatBalance = pool.distribute({
        caller: admin,
        recipient: userA,
        amount: 100n,
        idempotencyKey: 'idempotent-repeat',
      });
      assert.equal(repeatBalance, 900n);
      assert.equal(pool.getBalance(), 900n);
    });
  });

  describe('contract upgrade (#997)', () => {
    beforeEach(() => {
      pool.initialize({ admin, token, upgradeAdmin });
    });

    it('allows upgradeAdmin to update the contract bytecode hash', () => {
      pool.upgrade(upgradeAdmin, 'new_soroban_wasm_hash_v2');
      assert.equal(pool.getWasmHash(), 'new_soroban_wasm_hash_v2');

      const upgradeEvents = pool.getEvents().filter((e) => e.topic === 'upgrade');
      assert.equal(upgradeEvents.length, 1);
    });

    it('rejects upgrade from unauthorized caller', () => {
      assert.throws(() => {
        pool.upgrade(admin, 'unauthorized_hash'); // distribution admin cannot upgrade
      }, ContractUnauthorizedError);

      assert.throws(() => {
        pool.upgrade(attacker, 'malicious_hash');
      }, ContractUnauthorizedError);
    });
  });
});
