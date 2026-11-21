import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryKillSwitchStorage,
  InMemorySecretsProvider,
  ProductionPreflightError,
  assertProductionPreflight,
  runProductionPreflight,
} from '../../src/index.js';

const persistentKillSwitch = { get: () => ({ halted: false }), set: () => undefined };
const realSecrets = { getSecret: async () => 'x' } as never;

describe('production preflight (#1360)', () => {
  it('is a no-op outside production and staging', () => {
    assert.doesNotThrow(() =>
      assertProductionPreflight({ env: { NODE_ENV: 'development' }, killSwitchStorage: new InMemoryKillSwitchStorage() })
    );
  });

  it('refuses the in-memory defaults in production and in staging', () => {
    for (const NODE_ENV of ['production', 'staging']) {
      assert.throws(
        () =>
          assertProductionPreflight({
            env: { NODE_ENV },
            killSwitchStorage: new InMemoryKillSwitchStorage(),
            secretsProvider: new InMemorySecretsProvider(),
            challengeStore: 'memory',
          }),
        (err: unknown) => {
          assert.ok(err instanceof ProductionPreflightError);
          const failed = err.findings.filter((f) => !f.ok).map((f) => f.id);
          assert.deepEqual(failed.sort(), ['challenge-store', 'kill-switch', 'secrets-provider']);
          return true;
        }
      );
    }
  });

  it('passes with persistent implementations', () => {
    assert.doesNotThrow(() =>
      assertProductionPreflight({
        env: { NODE_ENV: 'production', STELLAR_NETWORK: 'TESTNET' },
        killSwitchStorage: persistentKillSwitch,
        secretsProvider: realSecrets,
        challengeStore: 'persistent',
      })
    );
  });

  it('requires the explicit opt-in for mainnet', () => {
    const base = {
      killSwitchStorage: persistentKillSwitch,
      secretsProvider: realSecrets,
      challengeStore: 'persistent' as const,
    };
    const without = runProductionPreflight({ ...base, env: { NODE_ENV: 'production', STELLAR_NETWORK: 'MAINNET' } });
    assert.equal(without.find((f) => f.id === 'mainnet-opt-in')!.ok, false);
    const withFlag = runProductionPreflight({
      ...base,
      env: { NODE_ENV: 'production', STELLAR_NETWORK: 'MAINNET', STELLAR_ALLOW_MAINNET: 'true' },
    });
    assert.equal(withFlag.find((f) => f.id === 'mainnet-opt-in')!.ok, true);
  });
});
