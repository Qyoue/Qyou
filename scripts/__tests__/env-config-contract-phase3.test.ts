import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getEnvContractPhase3, ENV_CONTRACTS_PHASE3 } from '../env-config-contract-phase3.js';

describe('getEnvContractPhase3', () => {
  it('returns contract for @qyou/api', () => {
    const c = getEnvContractPhase3('@qyou/api');
    assert.ok(c);
    assert.equal(c?.vars.length, 4);
    assert.ok(c?.validation.minSecretLength >= 12);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getEnvContractPhase3('@qyou/unknown'), undefined);
  });
});

describe('ENV_CONTRACTS_PHASE3', () => {
  it('all contracts have validation config', () => {
    for (const c of ENV_CONTRACTS_PHASE3) {
      assert.ok(c.workspace);
      assert.ok(c.vars.length > 0);
      assert.ok(typeof c.validation.requireExample === 'boolean');
      assert.ok(typeof c.validation.minSecretLength === 'number');
    }
  });

  it('api contract has productionRequired on secrets', () => {
    const api = ENV_CONTRACTS_PHASE3.find((c) => c.workspace === '@qyou/api');
    assert.ok(api?.vars.some((v) => v.secret && v.productionRequired));
  });

  it('mobile has an optional var', () => {
    const mobile = ENV_CONTRACTS_PHASE3.find((c) => c.workspace === '@qyou/mobile');
    assert.ok(mobile?.vars.some((v) => !v.required));
  });
});
