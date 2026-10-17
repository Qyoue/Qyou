import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DistributionKillSwitch,
  KillSwitchActiveError,
  AccountTransactionWatcher,
  type ObservedTransaction,
} from '../../src/security/index.js';
import { IncentiveService } from '../../src/services/incentive.service.js';
import { IncentivePoolClient } from '../../src/contracts/client.js';

describe('Emergency Kill Switch & Account Transaction Watcher (#1030, #1031)', () => {
  const DISTRIBUTION_ACCOUNT = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  const RECIPIENT_ACCOUNT = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
  const OTHER_ACCOUNT = 'GCXTAQ5QG3Z2YOMRLP2BGLF3J5O2U76X6U32V25W75L27YQ7H37K6Z5A';

  describe('DistributionKillSwitch (#1030)', () => {
    let killSwitch: DistributionKillSwitch;

    beforeEach(() => {
      DistributionKillSwitch.resetInstance();
      killSwitch = new DistributionKillSwitch();
    });

    it('initializes in an unhalted state', () => {
      assert.equal(killSwitch.isHalted(), false);
      assert.doesNotThrow(() => killSwitch.assertNotHalted());
      const state = killSwitch.getState();
      assert.equal(state.halted, false);
    });

    it('halts distributions immediately and records operator and reason', async () => {
      let notified = false;
      const unsubscribe = killSwitch.subscribe((state) => {
        if (state.halted) notified = true;
      });

      const state = await killSwitch.halt('Suspected key leak in distribution signer', 'sec-ops-alice');

      assert.equal(state.halted, true);
      assert.equal(state.reason, 'Suspected key leak in distribution signer');
      assert.equal(state.haltedBy, 'sec-ops-alice');
      assert.ok(typeof state.haltedAt === 'number');
      assert.equal(killSwitch.isHalted(), true);
      assert.equal(notified, true);

      assert.throws(
        () => killSwitch.assertNotHalted(),
        (err: Error) => {
          assert.ok(err instanceof KillSwitchActiveError);
          assert.match(err.message, /Suspected key leak in distribution signer/);
          assert.match(err.message, /sec-ops-alice/);
          return true;
        }
      );

      unsubscribe();
    });

    it('resumes distributions and records resumption metadata', async () => {
      await killSwitch.halt('Investigation ongoing', 'operator-1');
      assert.equal(killSwitch.isHalted(), true);

      const resumeState = await killSwitch.resume('operator-2');
      assert.equal(resumeState.halted, false);
      assert.equal(resumeState.resumedBy, 'operator-2');
      assert.ok(typeof resumeState.resumedAt === 'number');
      assert.equal(killSwitch.isHalted(), false);
      assert.doesNotThrow(() => killSwitch.assertNotHalted());
    });

    it('blocks IncentiveService.reward() when kill switch is halted', async () => {
      const client = new IncentivePoolClient({
        contractId: 'C1111111111111111111111111111111111111111111111111111111111',
        adminSignerKey: DISTRIBUTION_ACCOUNT,
      });
      await client.initialize({
        admin: DISTRIBUTION_ACCOUNT,
        token: 'CTOKEN1234567890',
        upgradeAdmin: DISTRIBUTION_ACCOUNT,
      });
      await client.deposit({
        from: DISTRIBUTION_ACCOUNT,
        amount: 100_000_000n,
      });

      const service = new IncentiveService({
        client,
        killSwitch,
      });

      service.setQueueConfig({
        queueId: 'q-test-halt',
        rewardAmount: '5.0',
        asset: 'XLM',
        enabled: true,
      });

      // 1. With kill switch halted -> reward throws KillSwitchActiveError
      killSwitch.haltSync('Emergency maintenance', 'ops');

      await assert.rejects(
        async () => {
          await service.reward({
            userId: 'user-halt-1',
            queueId: 'q-test-halt',
            recipient: RECIPIENT_ACCOUNT,
          });
        },
        (err: Error) => {
          assert.ok(err instanceof KillSwitchActiveError);
          assert.match(err.message, /Emergency maintenance/);
          return true;
        }
      );

      // 2. Resume -> reward succeeds
      killSwitch.resumeSync('ops');
      const record = await service.reward({
        userId: 'user-halt-1',
        queueId: 'q-test-halt',
        recipient: RECIPIENT_ACCOUNT,
      });
      assert.equal(record.status, 'confirmed');
    });
  });

  describe('AccountTransactionWatcher & Anomaly Alerting (#1031)', () => {
    let watcher: AccountTransactionWatcher;
    let killSwitch: DistributionKillSwitch;

    beforeEach(() => {
      DistributionKillSwitch.resetInstance();
      killSwitch = new DistributionKillSwitch();
      watcher = new AccountTransactionWatcher({
        distributionAccountId: DISTRIBUTION_ACCOUNT,
        autoHaltKillSwitch: killSwitch,
      });
    });

    it('registers authorized transaction hashes and ignores them', () => {
      const knownTxHash = 'e1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2';
      watcher.registerAuthorizedTransaction(knownTxHash);

      assert.equal(watcher.isAuthorized(knownTxHash), true);

      const observedTx: ObservedTransaction = {
        id: '1',
        hash: knownTxHash,
        sourceAccount: DISTRIBUTION_ACCOUNT,
        destination: RECIPIENT_ACCOUNT,
        amount: '10.0',
        asset: 'XLM',
        createdAt: Date.now(),
        successful: true,
      };

      const alert = watcher.processTransaction(observedTx);
      assert.equal(alert, null);
      assert.equal(watcher.getAlerts().length, 0);
      assert.equal(killSwitch.isHalted(), false);
    });

    it('ignores transactions from other source accounts', () => {
      const otherTx: ObservedTransaction = {
        id: '2',
        hash: 'f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8',
        sourceAccount: OTHER_ACCOUNT,
        destination: RECIPIENT_ACCOUNT,
        amount: '500.0',
        asset: 'XLM',
        createdAt: Date.now(),
        successful: true,
      };

      const alert = watcher.processTransaction(otherTx);
      assert.equal(alert, null);
      assert.equal(watcher.getAlerts().length, 0);
    });

    it('detects unauthorized outgoing transaction, emits alert, and auto-trips kill switch', () => {
      let emittedAlert = false;
      watcher.onAlert((alert) => {
        emittedAlert = true;
        assert.equal(alert.severity, 'CRITICAL');
        assert.equal(alert.sourceAccount, DISTRIBUTION_ACCOUNT);
      });

      const rogueTx: ObservedTransaction = {
        id: 'rogue-1',
        hash: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
        sourceAccount: DISTRIBUTION_ACCOUNT,
        destination: OTHER_ACCOUNT,
        amount: '1000.0',
        asset: 'XLM',
        createdAt: Date.now(),
        successful: true,
      };

      const alert = watcher.processTransaction(rogueTx);
      assert.ok(alert);
      assert.equal(alert?.txHash, rogueTx.hash);
      assert.equal(alert?.severity, 'CRITICAL');
      assert.match(alert?.message ?? '', /Unauthorized outgoing transaction detected/);
      assert.equal(emittedAlert, true);
      assert.equal(watcher.getAlerts().length, 1);

      // Auto-trip kill switch check
      assert.equal(killSwitch.isHalted(), true);
      assert.match(killSwitch.getState().reason ?? '', /AccountTransactionWatcher/);
    });

    it('integrates with IncentiveService to automatically authorize distributed transactions', async () => {
      const client = new IncentivePoolClient({
        contractId: 'C2222222222222222222222222222222222222222222222222222222222',
        adminSignerKey: DISTRIBUTION_ACCOUNT,
      });
      await client.initialize({
        admin: DISTRIBUTION_ACCOUNT,
        token: 'CTOKEN1234567890',
        upgradeAdmin: DISTRIBUTION_ACCOUNT,
      });
      await client.deposit({
        from: DISTRIBUTION_ACCOUNT,
        amount: 100_000_000n,
      });

      const service = new IncentiveService({
        client,
        killSwitch,
        transactionWatcher: watcher,
      });

      service.setQueueConfig({
        queueId: 'q-watched',
        rewardAmount: '10.0',
        asset: 'XLM',
        enabled: true,
      });

      const rewardRecord = await service.reward({
        userId: 'u-watched-1',
        queueId: 'q-watched',
        recipient: RECIPIENT_ACCOUNT,
      });

      assert.ok(rewardRecord.transactionHash);
      assert.equal(watcher.isAuthorized(rewardRecord.transactionHash), true);

      // Feeding that transaction to the watcher produces NO alert
      const alert = watcher.processTransaction({
        id: 'tx-1',
        hash: rewardRecord.transactionHash,
        sourceAccount: DISTRIBUTION_ACCOUNT,
        destination: RECIPIENT_ACCOUNT,
        amount: '10.0',
        asset: 'XLM',
        createdAt: Date.now(),
        successful: true,
      });
      assert.equal(alert, null);
    });
  });
});
