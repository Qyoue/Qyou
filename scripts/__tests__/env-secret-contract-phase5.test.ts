import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getEnvSecretPhase5Contract, ENV_SECRET_PHASE5_CONTRACTS, validateEnvSecretPhase5 } from '../env-secret-contract-phase5.js';

describe('getEnvSecretPhase5Contract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getEnvSecretPhase5Contract('@qyou/api');
    assert.ok(c);
    assert.ok(c?.vars.length >= 4);
    assert.ok(c?.rotation.enabled);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getEnvSecretPhase5Contract('@qyou/unknown'), undefined);
  });
});

describe('ENV_SECRET_PHASE5_CONTRACTS', () => {
  it('all contracts have validation and rotation', () => {
    for (const c of ENV_SECRET_PHASE5_CONTRACTS) {
      assert.ok(c.workspace);
      assert.ok(c.validation.requireExample);
      assert.ok(c.validation.requireGitignore);
      assert.ok(c.rotation.enabled);
    }
  });

  it('secrets have rotation policy', () => {
    for (const c of ENV_SECRET_PHASE5_CONTRACTS) {
      const secrets = c.vars.filter((v) => v.secret);
      for (const s of secrets) {
        assert.ok(s.rotationDays !== undefined, `${c.workspace}.${s.key} missing rotationDays`);
        assert.ok(s.minLength !== undefined, `${c.workspace}.${s.key} missing minLength`);
      }
    }
  });

  it('api contract has DATABASE_URL and JWT_SECRET', () => {
    const api = ENV_SECRET_PHASE5_CONTRACTS.find((c) => c.workspace === '@qyou/api');
    assert.ok(api?.vars.some((v) => v.key === 'DATABASE_URL' && v.encryptionRequired));
    assert.ok(api?.vars.some((v) => v.key === 'JWT_SECRET' && v.encryptionRequired));
  });
});

describe('validateEnvSecretPhase5', () => {
  it('passes for valid contract', () => {
    const api = getEnvSecretPhase5Contract('@qyou/api')!;
    assert.equal(validateEnvSecretPhase5(api).length, 0);
  });

  it('fails if rotation disabled', () => {
    const c = getEnvSecretPhase5Contract('@qyou/api')!;
    const broken = { ...c, rotation: { ...c.rotation, enabled: false } };
    const errors = validateEnvSecretPhase5(broken);
    assert.ok(errors.some((e) => e.includes('rotation')));
  });
});
