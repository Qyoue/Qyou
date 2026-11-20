import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SlackNotifier,
  formatBalanceAlert,
  wireSlackAlerts,
} from '../../src/monitoring/slack-notifier.js';
import { DistributionBalanceMonitor } from '../../src/monitoring/balance-monitor.js';

const URL = 'https://hooks.slack.com/services/T000/B000/XXXX';

describe('SlackNotifier (#1372)', () => {
  it('is disabled and does nothing without a webhook URL', async () => {
    let called = false;
    const n = new SlackNotifier({ fetchImpl: async () => ((called = true), { ok: true, status: 200 }) });
    assert.equal(n.enabled, false);
    assert.deepEqual(await n.notify('x'), { delivered: false, skipped: 'disabled' });
    assert.equal(called, false);
  });

  it('rejects a non-Slack webhook URL', () => {
    assert.throws(() => new SlackNotifier({ webhookUrl: 'https://example.com/hook' }), /hooks\.slack\.com/);
  });

  it('posts JSON to the webhook', async () => {
    const calls: Array<{ url: string; body: string }> = [];
    const n = new SlackNotifier({
      webhookUrl: URL,
      fetchImpl: async (url, init) => (calls.push({ url, body: init.body }), { ok: true, status: 200 }),
    });
    const res = await n.notify('hello');
    assert.equal(res.delivered, true);
    assert.equal(calls[0]!.url, URL);
    assert.equal(JSON.parse(calls[0]!.body).text, 'hello');
  });

  it('reports failures instead of throwing', async () => {
    const bad = new SlackNotifier({ webhookUrl: URL, fetchImpl: async () => ({ ok: false, status: 500 }) });
    assert.match((await bad.notify('x')).error ?? '', /500/);
    const boom = new SlackNotifier({
      webhookUrl: URL,
      fetchImpl: async () => {
        throw new Error('network down');
      },
    });
    assert.equal((await boom.notify('x')).error, 'network down');
  });

  it('sends a message when the balance monitor raises an alert', async () => {
    const sent: string[] = [];
    const notifier = new SlackNotifier({
      webhookUrl: URL,
      fetchImpl: async (_u, init) => (sent.push(JSON.parse(init.body).text), { ok: true, status: 200 }),
    });
    const monitor = new DistributionBalanceMonitor({
      accountAddress: 'GBZXN7PIRZGNMHGA72XZTOFGDPTGWTQReXAMPLEADMIN1234567890AB',
      warningThresholdXlm: 50,
      balanceProvider: async () => ({ xlm: '10' }),
    });
    const stop = wireSlackAlerts(notifier, { balanceMonitor: monitor });
    await monitor.checkBalance();
    await new Promise((r) => setTimeout(r, 10));
    stop();
    assert.equal(sent.length, 1);
    assert.match(sent[0]!, /Distribution balance/);
  });

  it('formats a balance alert with severity and account', () => {
    const text = formatBalanceAlert({
      id: '1',
      accountAddress: 'GABC',
      currentBalanceXlm: 5,
      thresholdXlm: 10,
      severity: 'critical',
      message: 'low',
      timestamp: 0,
    });
    assert.match(text, /critical/);
    assert.match(text, /GABC/);
  });
});
