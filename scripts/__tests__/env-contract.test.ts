import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateEnvFile, contracts, type EnvContract } from '../env-contract.js';

describe('validateEnvFile', () => {
  const apiContract = contracts[0] as EnvContract<unknown>;
  const goodVars = {
    NODE_ENV: 'development',
    PORT: '4000',
    DATABASE_URL: 'postgresql://localhost:5432/qyou',
    JWT_SECRET: 'my-secret-key',
    JWT_EXPIRES_IN: '1h',
  };

  it('passes valid env vars', () => {
    const result = validateEnvFile(goodVars, apiContract);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('warns on placeholder values', () => {
    const result = validateEnvFile(
      { ...goodVars, JWT_SECRET: 'change-me' },
      apiContract,
    );
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.includes('JWT_SECRET') && w.includes('placeholder')));
  });

  it('warns on unknown vars', () => {
    const result = validateEnvFile(
      { ...goodVars, UNKNOWN_VAR: 'some-value' },
      apiContract,
    );
    assert.ok(result.warnings.some((w) => w.includes('UNKNOWN_VAR')));
  });

  it('handles empty env gracefully', () => {
    const result = validateEnvFile({}, apiContract);
    assert.equal(result.valid, true);
  });
});

describe('contracts', () => {
  it('defines contracts for api, web, and mobile', () => {
    const names = contracts.map((c) => c.app);
    assert.ok(names.includes('apps/api'));
    assert.ok(names.includes('apps/web'));
    assert.ok(names.includes('apps/mobile'));
  });

  it('api contract has known vars', () => {
    const c = contracts[0];
    assert.ok(c.optionalWithDefault.includes('PORT'));
    assert.ok(c.optionalWithDefault.includes('JWT_SECRET'));
  });
});
