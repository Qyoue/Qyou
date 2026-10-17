import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  TransactionFeeTracker,
} from '../../src/analytics/fee-tracker.js';

describe('Stellar Transaction Fee & Cost Tracker (#1070)', () => {
  let tracker: TransactionFeeTracker;

  beforeEach(() => {
    TransactionFeeTracker.resetInstance();
    tracker = TransactionFeeTracker.getInstance();
  });

  it('1. Initializes with zero fee totals and empty summary', () => {
    const summary = tracker.getSummary();
    assert.equal(summary.totalTransactions, 0);
    assert.equal(summary.totalFeeStroops, '0');
    assert.equal(summary.totalFeeXlm, '0.0000000');
    assert.equal(summary.averageFeePerTxStroops, 0);
    assert.equal(summary.minFeeStroops, 0);
    assert.equal(summary.maxFeeStroops, 0);
    assert.equal(summary.lastTrackedAt, null);
  });

  it('2. Correctly converts stroops to decimal XLM strings', () => {
    assert.equal(TransactionFeeTracker.stroopsToXlm(100n), '0.0000100');
    assert.equal(TransactionFeeTracker.stroopsToXlm(10_000_000n), '1.0000000');
    assert.equal(TransactionFeeTracker.stroopsToXlm(15_500_000n), '1.5500000');
    assert.equal(TransactionFeeTracker.stroopsToXlm(0n), '0.0000000');
  });

  it('3. Records fee expenditures, updates totals, and tracks min/max boundaries', () => {
    const r1 = tracker.recordFee({
      txHash: 'tx-fee-1',
      feeStroops: 100,
      account: 'GADMIN1',
      memo: 'payout-1',
    });

    assert.equal(r1.feeStroops, 100n);
    assert.equal(r1.feeXlm, '0.0000100');

    const r2 = tracker.recordFee({
      txHash: 'tx-fee-2',
      feeStroops: 250,
      account: 'GADMIN1',
      memo: 'payout-2',
    });

    assert.equal(r2.feeStroops, 250n);

    const r3 = tracker.recordFee({
      txHash: 'tx-fee-3',
      feeStroops: 150,
      account: 'GADMIN1',
    });

    const summary = tracker.getSummary();
    assert.equal(summary.totalTransactions, 3);
    assert.equal(summary.totalFeeStroops, '500');
    assert.equal(summary.totalFeeXlm, '0.0000500');
    assert.equal(summary.averageFeePerTxStroops, 166);
    assert.equal(summary.minFeeStroops, 100);
    assert.equal(summary.maxFeeStroops, 250);
    assert.ok(summary.lastTrackedAt);

    const recent = tracker.getRecentRecords(2);
    assert.equal(recent.length, 2);
    assert.equal(recent[0].txHash, 'tx-fee-2');
    assert.equal(recent[1].txHash, 'tx-fee-3');
  });

  it('4. Generates Prometheus metrics exposition format for network fees', () => {
    tracker.recordFee({
      txHash: 'prom-tx-1',
      feeStroops: 200,
    });

    const prom = tracker.toPrometheusFormat();
    assert.ok(prom.includes('# HELP stellar_network_fees_paid_stroops_total'));
    assert.ok(prom.includes('stellar_network_fees_paid_stroops_total 200'));
    assert.ok(prom.includes('stellar_network_fees_paid_xlm_total 0.0000200'));
    assert.ok(prom.includes('stellar_network_fee_transactions_total 1'));
    assert.ok(prom.includes('stellar_average_fee_per_tx_stroops 200'));
  });

  it('5. Supports resetting fee records', () => {
    tracker.recordFee({ txHash: 'tx-clear', feeStroops: 500 });
    assert.equal(tracker.getSummary().totalTransactions, 1);

    tracker.clear();
    assert.equal(tracker.getSummary().totalTransactions, 0);
    assert.equal(tracker.getSummary().totalFeeStroops, '0');
  });
});
