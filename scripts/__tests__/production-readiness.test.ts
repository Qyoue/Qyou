import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkReadinessCriteria } from '../productionReadinessGate.js';

const SEED = 'S' + 'A'.repeat(55);
const good = {
  NODE_ENV: 'production',
  STELLAR_DISTRIBUTION_SECRET_KEY: SEED,
  KILL_SWITCH_STORAGE: 'redis',
  SECRETS_PROVIDER: 'aws',
  STELLAR_NETWORK: 'TESTNET',
};
const failing = (env: Record<string, string | undefined>) =>
  checkReadinessCriteria(env).filter((f) => !f.ok).map((f) => f.id);

describe('productionReadinessGate (#1361)', () => {
  it('passes for a production-safe configuration', () => {
    assert.deepEqual(failing(good), []);
  });

  it('fails on a missing or malformed signer', () => {
    assert.deepEqual(failing({ ...good, STELLAR_DISTRIBUTION_SECRET_KEY: '' }), ['signer']);
    assert.deepEqual(failing({ ...good, STELLAR_DISTRIBUTION_SECRET_KEY: 'not-a-seed' }), ['signer']);
  });

  it('fails on a memory or missing kill switch store', () => {
    assert.deepEqual(failing({ ...good, KILL_SWITCH_STORAGE: 'memory' }), ['kill-switch']);
    assert.deepEqual(failing({ ...good, KILL_SWITCH_STORAGE: undefined }), ['kill-switch']);
  });

  it('fails on a non-aws/vault secrets provider', () => {
    assert.deepEqual(failing({ ...good, SECRETS_PROVIDER: 'memory' }), ['secrets-provider']);
  });

  it('requires the mainnet opt-in', () => {
    assert.deepEqual(failing({ ...good, STELLAR_NETWORK: 'MAINNET' }), ['mainnet-opt-in']);
    assert.deepEqual(failing({ ...good, STELLAR_NETWORK: 'MAINNET', STELLAR_ALLOW_MAINNET: 'true' }), []);
  });
});
