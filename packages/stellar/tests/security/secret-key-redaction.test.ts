import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  redactStellarSecretKeys,
  sanitizeLogData,
} from '../../src/security/log-sanitizer.js';
import {
  SecretsManager,
  InMemorySecretsProvider,
} from '../../src/security/secrets-manager.js';

describe('Stellar Secret Key Redaction & Secrets Management (#1024, #1025)', () => {
  const SECRET_SEED = 'SBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';
  const PUBLIC_KEY = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU';

  it('redacts raw Stellar secret seeds from string messages (#1024)', () => {
    const rawLog = `Submitting transaction signed by secret seed ${SECRET_SEED} for account`;
    const redacted = redactStellarSecretKeys(rawLog);

    assert.ok(!redacted.includes(SECRET_SEED));
    assert.match(redacted, /\[REDACTED_STELLAR_SECRET_KEY\]/);
  });

  it('preserves public keys without redacting them (#1024)', () => {
    const rawLog = `Account public key is ${PUBLIC_KEY}`;
    const redacted = redactStellarSecretKeys(rawLog);

    assert.equal(redacted, rawLog);
  });

  it('recursively scrubs secret keys from objects and sensitive properties (#1024)', () => {
    const payload = {
      user: 'u-1',
      adminSignerKey: SECRET_SEED,
      metadata: {
        note: `Backup seed: ${SECRET_SEED}`,
      },
    };

    const sanitized = sanitizeLogData(payload) as {
      user: string;
      adminSignerKey: string;
      metadata: { note: string };
    };

    assert.equal(sanitized.user, 'u-1');
    assert.equal(sanitized.adminSignerKey, '[REDACTED_SECRET]');
    assert.ok(!sanitized.metadata.note.includes(SECRET_SEED));
    assert.match(sanitized.metadata.note, /\[REDACTED_STELLAR_SECRET_KEY\]/);
  });

  it('retrieves custodial distribution keys from dedicated SecretsManager (#1025)', async () => {
    const inMemoryProvider = new InMemorySecretsProvider();
    await inMemoryProvider.setSecret('STELLAR_DISTRIBUTION_SECRET_KEY', SECRET_SEED);

    const secretsManager = new SecretsManager(inMemoryProvider);
    const key = await secretsManager.getStellarDistributionKey();

    assert.equal(key, SECRET_SEED);
    assert.equal(secretsManager.getProviderName(), 'in-memory');
  });
});
