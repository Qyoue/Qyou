import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ReconciliationJob,
  type DbRewardItem,
  type OnChainTransactionItem,
  type ReconciliationDiscrepancy,
} from '../../src/monitoring/reconciliation-job.js';

describe('Payment-Layer Reconciliation Job (#1065)', () => {
  const dummyWallet = 'GBZXN7PIRZGNMHGA72XZTOFGDPTGWTQReXAMPLEADMIN1234567890AB';

  it('1. Reports clean status when all DB records perfectly match on-chain transactions', async () => {
    const dbRecords: DbRewardItem[] = [
      {
        id: 'rew-1',
        userId: 'u1',
        queueId: 'q1',
        recipientWallet: dummyWallet,
        amount: '50000000',
        transactionHash: 'txhash111',
        status: 'confirmed',
        createdAt: 1000,
        confirmedAt: 1050,
      },
      {
        id: 'rew-2',
        userId: 'u2',
        queueId: 'q1',
        recipientWallet: dummyWallet,
        amount: '25000000',
        transactionHash: 'txhash222',
        status: 'confirmed',
        createdAt: 1000,
        confirmedAt: 1060,
      },
    ];

    const chainTxs: OnChainTransactionItem[] = [
      {
        hash: 'txhash111',
        successful: true,
        amountStroops: 50_000_000n,
        recipient: dummyWallet,
        timestamp: 1050,
      },
      {
        hash: 'txhash222',
        successful: true,
        amountStroops: 25_000_000n,
        recipient: dummyWallet,
        timestamp: 1060,
      },
    ];

    const job = new ReconciliationJob({
      dbProvider: async () => dbRecords,
      chainProvider: async () => chainTxs,
    });

    const report = await job.reconcile();
    assert.equal(report.status, 'clean');
    assert.equal(report.matchedCount, 2);
    assert.equal(report.discrepancies.length, 0);
    assert.equal(job.getLastReport()?.status, 'clean');
  });

  it('2. Flags confirmed DB record missing from ledger as critical discrepancy', async () => {
    const dbRecords: DbRewardItem[] = [
      {
        id: 'rew-phantom',
        userId: 'u1',
        queueId: 'q1',
        recipientWallet: dummyWallet,
        amount: '50000000',
        transactionHash: 'txphantom999',
        status: 'confirmed',
        createdAt: 1000,
      },
    ];

    const chainTxs: OnChainTransactionItem[] = [];

    const discrepanciesAlerted: ReconciliationDiscrepancy[] = [];
    const job = new ReconciliationJob({
      dbProvider: async () => dbRecords,
      chainProvider: async () => chainTxs,
      onDiscrepanciesFound: (discrepancies) => {
        discrepanciesAlerted.push(...discrepancies);
      },
    });

    const report = await job.reconcile();
    assert.equal(report.status, 'discrepancies_found');
    assert.equal(report.discrepancies.length, 1);
    assert.equal(report.discrepancies[0].type, 'missing_on_chain');
    assert.equal(report.discrepancies[0].severity, 'critical');
    assert.equal(report.discrepancies[0].recordId, 'rew-phantom');

    assert.equal(discrepanciesAlerted.length, 1);
  });

  it('3. Flags on-chain transaction confirmed when DB status is still pending/failed', async () => {
    const dbRecords: DbRewardItem[] = [
      {
        id: 'rew-lagging',
        userId: 'u1',
        queueId: 'q1',
        recipientWallet: dummyWallet,
        amount: '50000000',
        transactionHash: 'txlagging333',
        status: 'pending',
        createdAt: 1000,
      },
    ];

    const chainTxs: OnChainTransactionItem[] = [
      {
        hash: 'txlagging333',
        successful: true,
        amountStroops: 50_000_000n,
        timestamp: 1050,
      },
    ];

    const job = new ReconciliationJob({
      dbProvider: async () => dbRecords,
      chainProvider: async () => chainTxs,
    });

    const report = await job.reconcile();
    assert.equal(report.status, 'discrepancies_found');
    assert.equal(report.discrepancies[0].type, 'unconfirmed_in_db');
    assert.equal(report.discrepancies[0].severity, 'warning');
  });

  it('4. Flags orphan on-chain payout with no matching DB record', async () => {
    const dbRecords: DbRewardItem[] = [];
    const chainTxs: OnChainTransactionItem[] = [
      {
        hash: 'txorphan888',
        successful: true,
        recipient: dummyWallet,
        amountStroops: 100_000_000n,
        timestamp: 1050,
      },
    ];

    const job = new ReconciliationJob({
      dbProvider: async () => dbRecords,
      chainProvider: async () => chainTxs,
    });

    const report = await job.reconcile();
    assert.equal(report.status, 'discrepancies_found');
    assert.equal(report.discrepancies[0].type, 'orphan_on_chain');
    assert.equal(report.discrepancies[0].severity, 'critical');
  });

  it('5. Flags transaction that failed on-chain', async () => {
    const dbRecords: DbRewardItem[] = [
      {
        id: 'rew-failed',
        userId: 'u1',
        queueId: 'q1',
        recipientWallet: dummyWallet,
        amount: '50000000',
        transactionHash: 'txfailed444',
        status: 'confirmed',
        createdAt: 1000,
      },
    ];

    const chainTxs: OnChainTransactionItem[] = [
      {
        hash: 'txfailed444',
        successful: false,
        timestamp: 1050,
      },
    ];

    const job = new ReconciliationJob({
      dbProvider: async () => dbRecords,
      chainProvider: async () => chainTxs,
    });

    const report = await job.reconcile();
    assert.equal(report.status, 'discrepancies_found');
    assert.equal(report.discrepancies[0].type, 'failed_on_chain');
  });

  it('6. Flags amount mismatch between DB and chain', async () => {
    const dbRecords: DbRewardItem[] = [
      {
        id: 'rew-mismatch',
        userId: 'u1',
        queueId: 'q1',
        recipientWallet: dummyWallet,
        amount: '50000000',
        transactionHash: 'txmismatch555',
        status: 'confirmed',
        createdAt: 1000,
      },
    ];

    const chainTxs: OnChainTransactionItem[] = [
      {
        hash: 'txmismatch555',
        successful: true,
        amountStroops: 10_000_000n, // Expected 50_000_000n
        timestamp: 1050,
      },
    ];

    const job = new ReconciliationJob({
      dbProvider: async () => dbRecords,
      chainProvider: async () => chainTxs,
    });

    const report = await job.reconcile();
    assert.equal(report.status, 'discrepancies_found');
    assert.equal(report.discrepancies[0].type, 'amount_mismatch');
  });
});
