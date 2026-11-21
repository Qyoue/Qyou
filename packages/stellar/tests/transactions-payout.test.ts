import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PayoutPreflightError,
  assertPayoutPreflight,
  minimumBalanceXlm,
  preflightPayout,
  type PayoutAccount,
} from '../src/transactions/payout-preflight.js';
import { PayoutSubmitter } from '../src/transactions/payout-submitter.js';
import { TtlExtensionJob } from '../src/monitoring/ttl-extension-job.js';

const R = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7';
const funded = (over: Partial<PayoutAccount> = {}): PayoutAccount => ({
  subentryCount: 0,
  balances: [{ assetType: 'native', balance: '10.0000000' }],
  ...over,
});

describe('payout preflight (#1364)', () => {
  it('computes the minimum balance from subentries', () => {
    assert.equal(minimumBalanceXlm(0), 1);
    assert.equal(minimumBalanceXlm(3), 2.5);
  });

  it('fails for a missing account', async () => {
    const r = await preflightPayout({ recipient: R, asset: { code: 'native' }, amount: '5', loadAccount: async () => null });
    assert.deepEqual(r.issues.map((i) => i.code), ['ACCOUNT_NOT_FOUND']);
  });

  it('fails for an under-funded account', async () => {
    const r = await preflightPayout({
      recipient: R,
      asset: { code: 'native' },
      amount: '5',
      loadAccount: async () => funded({ subentryCount: 4, balances: [{ assetType: 'native', balance: '2.0' }] }),
    });
    assert.deepEqual(r.issues.map((i) => i.code), ['ACCOUNT_NOT_FUNDED']);
  });

  it('passes a funded account for a native payout', async () => {
    const r = await preflightPayout({ recipient: R, asset: { code: 'native' }, amount: '5', loadAccount: async () => funded() });
    assert.equal(r.ok, true);
  });

  it('checks the trustline for a non-native asset', async () => {
    const ask = (account: PayoutAccount) =>
      preflightPayout({ recipient: R, asset: { code: 'QYOU', issuer: 'GISSUER' }, amount: '10', loadAccount: async () => account });

    assert.deepEqual((await ask(funded())).issues.map((i) => i.code), ['NO_TRUSTLINE']);

    const line = { assetType: 'credit_alphanum4', assetCode: 'QYOU', assetIssuer: 'GISSUER', balance: '0', limit: '100' };
    assert.equal((await ask(funded({ balances: [...funded().balances, line] }))).ok, true);
    assert.deepEqual(
      (await ask(funded({ balances: [...funded().balances, { ...line, isAuthorized: false }] }))).issues.map((i) => i.code),
      ['TRUSTLINE_NOT_AUTHORIZED'],
    );
    assert.deepEqual(
      (await ask(funded({ balances: [...funded().balances, { ...line, balance: '95' }] }))).issues.map((i) => i.code),
      ['TRUSTLINE_LIMIT_EXCEEDED'],
    );
  });

  it('assertPayoutPreflight throws a typed error', async () => {
    await assert.rejects(
      assertPayoutPreflight({ recipient: R, asset: { code: 'native' }, amount: '1', loadAccount: async () => null }),
      PayoutPreflightError,
    );
  });
});

describe('PayoutSubmitter (#1365)', () => {
  it('never reuses a sequence number across concurrent payouts', async () => {
    const accounts = ['GCH1', 'GCH2', 'GCH3'].map((publicKey) => ({ publicKey, balanceStroops: 100_000_000n }));
    const submitter = new PayoutSubmitter({ accounts, loadSequence: async () => '100' });
    const used = new Map<string, string[]>();

    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        submitter.submit(async (channel, sequence) => {
          await new Promise((r) => setTimeout(r, (i % 3) * 2));
          used.set(channel.publicKey, [...(used.get(channel.publicKey) ?? []), sequence]);
        }),
      ),
    );

    let total = 0;
    for (const seqs of used.values()) {
      total += seqs.length;
      assert.equal(new Set(seqs).size, seqs.length, 'duplicate sequence on a channel account');
      assert.deepEqual(seqs, [...seqs].sort((a, b) => Number(a) - Number(b)), 'sequences must increase');
    }
    assert.equal(total, 12);
  });

  it('reloads the sequence once after tx_bad_seq', async () => {
    const submitter = new PayoutSubmitter({
      accounts: [{ publicKey: 'GCH1', balanceStroops: 100_000_000n }],
      loadSequence: async () => '10',
    });
    let attempts = 0;
    const result = await submitter.submit(async (_c, seq) => {
      attempts += 1;
      if (attempts === 1) throw new Error('tx_bad_seq');
      return seq;
    });
    assert.equal(attempts, 2);
    assert.equal(result, '11');
  });

  it('reports channel account health', () => {
    const submitter = new PayoutSubmitter({
      accounts: [
        { publicKey: 'GCH1', balanceStroops: 100_000_000n },
        { publicKey: 'GCH2', balanceStroops: 1n },
      ],
      loadSequence: async () => '1',
    });
    assert.deepEqual(submitter.health().lowBalance, ['GCH2']);
  });
});

describe('TtlExtensionJob (#1366)', () => {
  it('does nothing while enough TTL remains', async () => {
    let extended = false;
    const job = new TtlExtensionJob({
      getRemainingLedgers: async () => 100_000,
      extend: async () => ((extended = true), 'tx'),
    });
    assert.deepEqual(await job.run(), { action: 'none', remaining: 100_000 });
    assert.equal(extended, false);
  });

  it('extends when the remaining TTL falls below the threshold', async () => {
    const calls: Array<[number, number]> = [];
    const job = new TtlExtensionJob({
      getRemainingLedgers: async () => 1000,
      extend: async (t, e) => (calls.push([t, e]), 'tx-hash'),
      thresholdLedgers: 5000,
      extendToLedgers: 50_000,
    });
    assert.deepEqual(await job.run(), { action: 'extended', remaining: 1000, txHash: 'tx-hash' });
    assert.deepEqual(calls, [[5000, 50_000]]);
  });

  it('reports failures without throwing', async () => {
    const errors: unknown[] = [];
    const job = new TtlExtensionJob({
      getRemainingLedgers: async () => {
        throw new Error('rpc down');
      },
      extend: async () => 'x',
      onError: (e) => errors.push(e),
    });
    assert.deepEqual(await job.run(), { action: 'failed', error: 'rpc down' });
    assert.equal(errors.length, 1);
  });

  it('rejects an extendTo that is not above the threshold', () => {
    assert.throws(
      () => new TtlExtensionJob({ getRemainingLedgers: async () => 1, extend: async () => 'x', thresholdLedgers: 10, extendToLedgers: 10 }),
      /greater than/,
    );
  });
});
