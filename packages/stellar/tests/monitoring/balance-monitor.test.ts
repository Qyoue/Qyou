import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DistributionBalanceMonitor,
  type BalanceAlert,
} from '../../src/monitoring/balance-monitor.js';

describe('Distribution Account Balance Monitor & Alert Service (#1063)', () => {
  const account = 'GBZXN7PIRZGNMHGA72XZTOFGDPTGWTQReXAMPLEADMIN1234567890AB';

  it('1. Validates required constructor parameters', () => {
    assert.throws(
      () =>
        new DistributionBalanceMonitor({
          accountAddress: '',
          warningThresholdXlm: 50,
          balanceProvider: async () => ({ xlm: '100' }),
        }),
      /accountAddress is required/
    );

    assert.throws(
      () =>
        new DistributionBalanceMonitor({
          accountAddress: account,
          warningThresholdXlm: 0,
          balanceProvider: async () => ({ xlm: '100' }),
        }),
      /warningThresholdXlm must be greater than 0/
    );
  });

  it('2. Evaluates healthy status when balance is above thresholds', async () => {
    const monitor = new DistributionBalanceMonitor({
      accountAddress: account,
      warningThresholdXlm: 50,
      criticalThresholdXlm: 10,
      balanceProvider: async () => ({ xlm: '150.5000000' }),
    });

    const result = await monitor.checkBalance();
    assert.equal(result.currentBalanceXlm, 150.5);
    assert.equal(result.alertTriggered, false);
    assert.equal(result.alert, undefined);

    const status = monitor.getStatus();
    assert.equal(status.status, 'healthy');
    assert.equal(status.lastBalanceXlm, 150.5);
    assert.equal(monitor.getAlertHistory().length, 0);
  });

  it('3. Triggers warning alert when balance drops below warning threshold', async () => {
    const alerts: BalanceAlert[] = [];
    const monitor = new DistributionBalanceMonitor({
      accountAddress: account,
      warningThresholdXlm: 50,
      criticalThresholdXlm: 10,
      balanceProvider: async () => ({ xlm: '35.0000000' }),
      onAlert: (alert) => {
        alerts.push(alert);
      },
    });

    const result = await monitor.checkBalance();
    assert.equal(result.alertTriggered, true);
    assert.ok(result.alert);
    assert.equal(result.alert.severity, 'warning');
    assert.equal(result.alert.currentBalanceXlm, 35);
    assert.ok(result.alert.message.includes('WARNING'));

    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].severity, 'warning');
    assert.equal(monitor.getStatus().status, 'warning');
    assert.equal(monitor.getAlertHistory().length, 1);
  });

  it('4. Triggers critical alert when balance drops below critical threshold', async () => {
    const alerts: BalanceAlert[] = [];
    const monitor = new DistributionBalanceMonitor({
      accountAddress: account,
      warningThresholdXlm: 50,
      criticalThresholdXlm: 15,
      balanceProvider: async () => ({ xlm: '8.2500000' }),
      onAlert: (alert) => {
        alerts.push(alert);
      },
    });

    const result = await monitor.checkBalance();
    assert.equal(result.alertTriggered, true);
    assert.ok(result.alert);
    assert.equal(result.alert.severity, 'critical');
    assert.equal(result.alert.currentBalanceXlm, 8.25);
    assert.ok(result.alert.message.includes('CRITICAL'));

    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].severity, 'critical');
    assert.equal(monitor.getStatus().status, 'critical');
  });

  it('5. Supports scheduled checking and clean stop', async () => {
    let checkCount = 0;
    const monitor = new DistributionBalanceMonitor({
      accountAddress: account,
      warningThresholdXlm: 50,
      balanceProvider: async () => {
        checkCount++;
        return { xlm: '100' };
      },
    });

    monitor.startScheduled(50);
    assert.equal(monitor.getStatus().isRunning, true);

    await new Promise((r) => setTimeout(r, 120));
    monitor.stopScheduled();

    assert.equal(monitor.getStatus().isRunning, false);
    assert.ok(checkCount >= 2);
  });
});
