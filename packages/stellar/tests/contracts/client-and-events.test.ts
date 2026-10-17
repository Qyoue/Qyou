import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  IncentivePoolClient,
  IncentivePoolContract,
  parseContractEvent,
  reconcileRewardDistributions,
  DbRewardRecord,
} from '../../src/index.js';
import { deployToTestnet, generateTestnetContractId } from '../../scripts/deploy-testnet.js';

describe('IncentivePoolClient & Events (#998-#1001)', () => {
  const adminKey = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  const tokenAddress = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
  const upgradeKey = 'GCIWOCBH4SSTQ3552LGTJ6G5L3O5HQ2I2TFWKGWZ567Q23LXZAZ77K65';
  const recipientKey = 'GDUSERB1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  describe('testnet deployment script (#998)', () => {
    it('generates a deterministic contract ID starting with C', () => {
      const contractId = generateTestnetContractId(adminKey, 1700000000);
      assert.ok(contractId.startsWith('C'));
      assert.equal(contractId.length, 57);
    });

    it('deploys to testnet with dry-run without errors', async () => {
      const res = await deployToTestnet({
        dryRun: true,
        network: 'testnet',
        adminAddress: adminKey,
      });

      assert.ok(res.contractId.startsWith('C'));
      assert.equal(res.network, 'testnet');
      assert.equal(res.adminAddress, adminKey);
      assert.ok(res.wasmHash.length > 0);
    });
  });

  describe('IncentivePoolClient (#1000)', () => {
    let client: IncentivePoolClient;
    let contractInstance: IncentivePoolContract;

    beforeEach(async () => {
      contractInstance = new IncentivePoolContract();
      client = new IncentivePoolClient({
        contractId: 'C1234567890TESTNETCONTRACTID',
        adminSignerKey: adminKey,
        contractInstance,
      });

      await client.initialize({
        admin: adminKey,
        token: tokenAddress,
        upgradeAdmin: upgradeKey,
      });
    });

    it('deposits funds and returns DepositResult', async () => {
      const res = await client.deposit({
        from: adminKey,
        amount: 2000n,
      });

      assert.equal(res.success, true);
      assert.equal(res.newBalance, 2000n);
      assert.equal(res.amount, 2000n);
      assert.ok(res.txHash.length > 0);

      const balance = await client.getBalance();
      assert.equal(balance, 2000n);
    });

    it('distributes rewards to recipient with idempotency', async () => {
      await client.deposit({ from: adminKey, amount: 1000n });

      const distRes = await client.distribute({
        recipient: recipientKey,
        amount: 300n,
        idempotencyKey: 'idemp-queue-task-1',
      });

      assert.equal(distRes.success, true);
      assert.equal(distRes.recipient, recipientKey);
      assert.equal(distRes.newBalance, 700n);
      assert.equal(distRes.amount, 300n);
      assert.ok(distRes.txHash.length > 0);

      // Verify idempotency on second call
      const distRes2 = await client.distribute({
        recipient: recipientKey,
        amount: 300n,
        idempotencyKey: 'idemp-queue-task-1',
      });
      assert.equal(distRes2.newBalance, 700n);
      assert.equal(await client.getBalance(), 700n);
    });

    it('fetches admin and contract events', async () => {
      assert.equal(await client.getAdmin(), adminKey);
      await client.deposit({ from: adminKey, amount: 500n });
      const events = await client.getEvents();
      assert.ok(events.length >= 1);
    });
  });

  describe('contract event parsing & reconciliation (#1001)', () => {
    it('parses raw distribution and deposit events correctly', () => {
      const parsedDist = parseContractEvent({
        topic: 'distribute',
        data: {
          recipient: recipientKey,
          amount: '450',
          idempotencyKey: 'idemp-test-parse',
        },
      });

      assert.ok(parsedDist);
      assert.equal(parsedDist.topic, 'distribute');
      if (parsedDist.topic === 'distribute') {
        assert.equal(parsedDist.recipient, recipientKey);
        assert.equal(parsedDist.amount, 450n);
        assert.equal(parsedDist.idempotencyKey, 'idemp-test-parse');
      }

      const parsedDep = parseContractEvent({
        topic: 'deposit',
        data: {
          from: adminKey,
          amount: '1200',
        },
      });
      assert.ok(parsedDep);
      assert.equal(parsedDep.topic, 'deposit');
    });

    it('reconciles DB reward records against on-chain distribution events', () => {
      const dbRecords: DbRewardRecord[] = [
        {
          id: 'reward-1',
          userId: 'user-1',
          amount: '100',
          recipientWallet: recipientKey,
          idempotencyKey: 'idem-1',
          status: 'confirmed',
        },
        {
          id: 'reward-2',
          userId: 'user-2',
          amount: '200',
          recipientWallet: recipientKey,
          idempotencyKey: 'idem-2',
          status: 'confirmed',
        },
      ];

      const onChainEvents = [
        {
          topic: 'distribute' as const,
          recipient: recipientKey,
          amount: 100n,
          idempotencyKey: 'idem-1',
          timestamp: Date.now(),
        },
        // idem-2 missing on chain
      ];

      const report = reconcileRewardDistributions(dbRecords, onChainEvents);

      assert.equal(report.totalDbRecords, 2);
      assert.equal(report.totalOnChainEvents, 1);
      assert.equal(report.matchedCount, 1);
      assert.equal(report.discrepanciesCount, 1);

      const missing = report.items.find((i) => i.idempotencyKey === 'idem-2');
      assert.ok(missing);
      assert.equal(missing.status, 'missing_on_chain');
    });
  });
});
