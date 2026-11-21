import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getStellarNetworkConfig } from '../../src/config/network.js';
import { SecretsManager } from '../../src/security/secrets-manager.js';

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

describe('network config', () => {
  it('requires STELLAR_NETWORK in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.STELLAR_NETWORK;
    assert.throws(() => getStellarNetworkConfig(), /STELLAR_NETWORK/);
  });

  it('defaults to testnet outside production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.STELLAR_NETWORK;
    assert.equal(getStellarNetworkConfig().network, 'testnet');
  });

  for (const key of ['constructor', 'toString', '__proto__']) {
    it(`rejects prototype key ${key}`, () => {
      process.env.STELLAR_NETWORK = key;
      assert.throws(() => getStellarNetworkConfig(), /Invalid or unsupported/);
    });
  }
});

describe('SecretsManager', () => {
  it('does not use the in-memory provider in staging', () => {
    process.env.NODE_ENV = 'staging';
    assert.equal(new SecretsManager().getProviderName(), 'aws-secrets-manager');
  });
});
