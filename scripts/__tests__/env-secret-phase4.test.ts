import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getEnvSecretPhase4Contract, ENV_SECRET_PHASE4_CONTRACTS, validateEnvSecretPhase4Contract } from '../env-secret-contract-phase4.js';

describe('getEnvSecretPhase4Contract', () => {
  it('returns contract for @qyou/api', () => {
    const c = getEnvSecretPhase4Contract('@qyou/api');
    assert.ok(c);
    assert.equal(c?.vars.length, 5);
  });

  it('returns contract for root', () => {
    const c = getEnvSecretPhase4Contract('root');
    assert.ok(c);
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getEnvSecretPhase4Contract('@qyou/unknown'), undefined);
  });
});

describe('ENV_SECRET_PHASE4_CONTRACTS', () => {
  it('has all workspace contracts', () => {
    const workspaces = ['root', '@qyou/api', '@qyou/web', '@qyou/mobile'];
    for (const ws of workspaces) {
      assert.ok(ENV_SECRET_PHASE4_CONTRACTS.some((c) => c.workspace === ws), `Missing contract for ${ws}`);
    }
  });

  it('all contracts have vars defined', () => {
    for (const c of ENV_SECRET_PHASE4_CONTRACTS) {
      assert.ok(c.vars.length > 0, `${c.workspace} has no vars`);
    }
  });

  it('all contracts requireExample is true', () => {
    for (const c of ENV_SECRET_PHASE4_CONTRACTS) {
      assert.ok(c.requireExample, `${c.workspace} must require .env.example`);
    }
  });

  it('api has DATABASE_URL and JWT_SECRET secrets', () => {
    const api = ENV_SECRET_PHASE4_CONTRACTS.find((c) => c.workspace === '@qyou/api')!;
    const secrets = api.vars.filter((v) => v.secret);
    assert.ok(secrets.some((s) => s.key === 'DATABASE_URL'));
    assert.ok(secrets.some((s) => s.key === 'JWT_SECRET'));
  });

  it('api has PORT as required non-secret', () => {
    const api = ENV_SECRET_PHASE4_CONTRACTS.find((c) => c.workspace === '@qyou/api')!;
    const port = api.vars.find((v) => v.key === 'PORT')!;
    assert.ok(port.required);
    assert.ok(!port.secret);
  });
});

describe('validateEnvSecretPhase4Contract', () => {
  it('passes for valid contract', () => {
    const api = getEnvSecretPhase4Contract('@qyou/api')!;
    assert.equal(validateEnvSecretPhase4Contract(api).length, 0);
  });

  it('fails if requireExample is false', () => {
    const c = getEnvSecretPhase4Contract('@qyou/api')!;
    const broken = { ...c, requireExample: false };
    const errors = validateEnvSecretPhase4Contract(broken);
    assert.ok(errors.some((e) => e.includes('requireExample')));
  });

  it('fails if rotationDays < 30', () => {
    const c = getEnvSecretPhase4Contract('@qyou/api')!;
    const broken = { ...c, rotationDays: 15 };
    const errors = validateEnvSecretPhase4Contract(broken);
    assert.ok(errors.some((e) => e.includes('rotationDays')));
  });
});
