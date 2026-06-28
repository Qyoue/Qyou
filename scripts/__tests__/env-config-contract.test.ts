import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getEnvContract, validateEnvFile, ENV_CONFIG_CONTRACTS } from '../env-config-contract.js';

describe('getEnvContract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getEnvContract('@qyou/api');
    assert.ok(c);
    assert.equal(c?.vars.length, 4);
  });

  it('returns contract for @qyou/web', () => {
    const c = getEnvContract('@qyou/web');
    assert.ok(c);
    assert.equal(c?.vars.length, 1);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getEnvContract('@qyou/unknown'), undefined);
  });
});

describe('ENV_CONFIG_CONTRACTS', () => {
  it('all contracts have required fields', () => {
    for (const c of ENV_CONFIG_CONTRACTS) {
      assert.ok(c.workspace);
      assert.ok(c.envFile);
      assert.ok(Array.isArray(c.vars));
      for (const v of c.vars) {
        assert.ok(v.key);
        assert.ok(typeof v.required === 'boolean');
        assert.ok(typeof v.secret === 'boolean');
      }
    }
  });
});

describe('validateEnvFile', () => {
  it('passes when all required vars present', () => {
    const result = validateEnvFile('@qyou/web', { NEXT_PUBLIC_API_URL: 'http://localhost:4000' });
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('fails when required var missing', () => {
    const result = validateEnvFile('@qyou/api', { PORT: '4000' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('DATABASE_URL')));
  });

  it('warns on short secret', () => {
    const result = validateEnvFile('@qyou/api', {
      PORT: '4000',
      DATABASE_URL: 'pg://localhost',
      JWT_SECRET: 'short',
      JWT_EXPIRES_IN: '1h',
    });
    assert.ok(result.warnings.some((w) => w.includes('too short')));
  });

  it('warns on unknown vars', () => {
    const result = validateEnvFile('@qyou/web', {
      NEXT_PUBLIC_API_URL: 'http://localhost:4000',
      UNKNOWN_VAR: 'value',
    });
    assert.ok(result.warnings.some((w) => w.includes('Unknown')));
  });
});
