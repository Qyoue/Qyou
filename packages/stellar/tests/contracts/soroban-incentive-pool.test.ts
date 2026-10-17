import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  IncentivePoolContract,
  ContractError,
  ContractUnauthorizedError,
  ContractInsufficientBalanceError,
  ContractInvalidAmountError,
  ContractAlreadyInitializedError,
} from '../../src/contracts/incentive-pool.js';

describe('Soroban IncentivePool Contract Full Lifecycle Tests (#1041)', () => {
  const ADMIN = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  const UPGRADE_ADMIN = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
  const RECIPIENT = 'GCXTAQ5QG3Z2YOMRLP2BGLF3J5O2U76X6U32V25W75L27YQ7H37K6Z5A';
  const MALICIOUS_CALLER = 'GDTESTMALICIOUSCALLER123456789012345678901234567890123456';
  const TOKEN_ADDRESS = 'CTOKEN12345678901234567890123456789012345678901234567890';

  let contract: IncentivePoolContract;

  beforeEach(() => {
    contract = new IncentivePoolContract();
  });

  describe('Contract Initialization', () => {
    it('initializes with admin, token, and upgradeAdmin and starts with zero balance', () => {
      contract.initialize({
        admin: ADMIN,
        token: TOKEN_ADDRESS,
        upgradeAdmin: UPGRADE_ADMIN,
      });

      assert.equal(contract.getBalance(), 0n);
      assert.equal(contract.getAdmin(), ADMIN);
      assert.equal(contract.getToken(), TOKEN_ADDRESS);
    });

    it('rejects duplicate initialization with ContractAlreadyInitializedError', () => {
      contract.initialize({
        admin: ADMIN,
        token: TOKEN_ADDRESS,
        upgradeAdmin: UPGRADE_ADMIN,
      });

      assert.throws(
        () =>
          contract.initialize({
            admin: ADMIN,
            token: TOKEN_ADDRESS,
            upgradeAdmin: UPGRADE_ADMIN,
          }),
        (err: Error) => err instanceof ContractAlreadyInitializedError
      );
    });
  });

  describe('Contract Deposit Operations', () => {
    beforeEach(() => {
      contract.initialize({
        admin: ADMIN,
        token: TOKEN_ADDRESS,
        upgradeAdmin: UPGRADE_ADMIN,
      });
    });

    it('deposits funds and increases contract balance accounting', () => {
      const newBal = contract.deposit({
        from: ADMIN,
        amount: 250_000_000n, // 25 XLM in stroops
      });

      assert.equal(newBal, 250_000_000n);
      assert.equal(contract.getBalance(), 250_000_000n);

      const events = contract.getEvents();
      assert.equal(events.length, 1);
      assert.equal(events[0].topic, 'deposit');
      assert.equal(events[0].data.amount, '250000000');
    });

    it('rejects deposit with zero or negative amounts', () => {
      assert.throws(
        () => contract.deposit({ from: ADMIN, amount: 0n }),
        (err: Error) => err instanceof ContractInvalidAmountError
      );
      assert.throws(
        () => contract.deposit({ from: ADMIN, amount: -100n }),
        (err: Error) => err instanceof ContractInvalidAmountError
      );
    });
  });

  describe('Contract Distribution Operations', () => {
    beforeEach(() => {
      contract.initialize({
        admin: ADMIN,
        token: TOKEN_ADDRESS,
        upgradeAdmin: UPGRADE_ADMIN,
      });
      contract.deposit({
        from: ADMIN,
        amount: 50_000_000n, // 5 XLM
      });
    });

    it('allows admin to distribute rewards to recipients', () => {
      const newBal = contract.distribute({
        caller: ADMIN,
        recipient: RECIPIENT,
        amount: 15_000_000n, // 1.5 XLM
        idempotencyKey: 'dist-001',
      });

      assert.equal(newBal, 35_000_000n);
      assert.equal(contract.getBalance(), 35_000_000n);

      const events = contract.getEvents();
      const distEvent = events.find((e) => e.topic === 'distribute');
      assert.ok(distEvent);
      assert.equal(distEvent?.data.recipient, RECIPIENT);
      assert.equal(distEvent?.data.amount, '15000000');
    });

    it('rejects distribution from non-admin caller', () => {
      assert.throws(
        () =>
          contract.distribute({
            caller: MALICIOUS_CALLER,
            recipient: RECIPIENT,
            amount: 10_000_000n,
            idempotencyKey: 'dist-rogue',
          }),
        (err: Error) => err instanceof ContractUnauthorizedError
      );
    });

    it('rejects distribution exceeding contract balance', () => {
      assert.throws(
        () =>
          contract.distribute({
            caller: ADMIN,
            recipient: RECIPIENT,
            amount: 100_000_000n, // 10 XLM > 5 XLM available
            idempotencyKey: 'dist-overdraw',
          }),
        (err: Error) => err instanceof ContractInsufficientBalanceError
      );
    });

    it('guarantees idempotency on duplicate distribution calls', () => {
      const first = contract.distribute({
        caller: ADMIN,
        recipient: RECIPIENT,
        amount: 10_000_000n,
        idempotencyKey: 'dist-idem-key-1',
      });

      const balAfterFirst = contract.getBalance();

      // Second identical distribution
      const second = contract.distribute({
        caller: ADMIN,
        recipient: RECIPIENT,
        amount: 10_000_000n,
        idempotencyKey: 'dist-idem-key-1',
      });

      assert.equal(second, first);
      assert.equal(contract.getBalance(), balAfterFirst);
    });
  });

  describe('Contract Bytecode Upgrade Operations', () => {
    beforeEach(() => {
      contract.initialize({
        admin: ADMIN,
        token: TOKEN_ADDRESS,
        upgradeAdmin: UPGRADE_ADMIN,
      });
    });

    it('allows upgradeAdmin to update contract WASM hash', () => {
      const newWasmHash = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
      contract.upgrade(UPGRADE_ADMIN, newWasmHash);
      assert.equal(contract.getWasmHash(), newWasmHash);
    });

    it('rejects upgrade attempts by distribution admin or unauthorized callers', () => {
      const newWasmHash = '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff';
      assert.throws(
        () => contract.upgrade(ADMIN, newWasmHash),
        (err: Error) => err instanceof ContractUnauthorizedError
      );
    });
  });
});
