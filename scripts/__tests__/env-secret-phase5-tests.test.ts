import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getEnvSecretPhase5Contract, ENV_SECRET_PHASE5_CONTRACTS, validateEnvSecretPhase5 } from '../env-secret-contract-phase5.js';

describe('Env/Secret Phase 5 Tests', () => {
  it('getEnvSecretPhase5Contract returns api contract', () => {
    const c = getEnvSecretPhase5Contract('@qyou/api');
    assert.ok(c);
    assert.ok(c!.vars.length >= 4);
  });

  it('getEnvSecretPhase5Contract returns root contract', () => {
    const c = getEnvSecretPhase5Contract('root');
    assert.ok(c);
  });

  it('getEnvSecretPhase5Contract returns undefined for unknown', () => {
    assert.equal(getEnvSecretPhase5Contract('@qyou/unknown'), undefined);
  });

  it('all contracts have validation config', () => {
    for (const c of ENV_SECRET_PHASE5_CONTRACTS) {
      assert.ok(c.validation.requireExample);
      assert.ok(c.validation.requireGitignore);
      assert.ok(c.validation.minSecretLength >= 8);
    }
  });

  it('all contracts have rotation enabled', () => {
    for (const c of ENV_SECRET_PHASE5_CONTRACTS) {
      assert.ok(c.rotation.enabled);
      assert.ok(c.rotation.defaultRotationDays > 0);
      assert.ok(c.rotation.notifyBeforeDays > 0);
    }
  });

  it('secrets have rotation and minLength', () => {
    for (const c of ENV_SECRET_PHASE5_CONTRACTS) {
      for (const v of c.vars) {
        if (v.secret) {
          assert.ok(v.rotationDays !== undefined, `${c.workspace}.${v.key}: missing rotationDays`);
          assert.ok(v.minLength !== undefined, `${c.workspace}.${v.key}: missing minLength`);
          assert.ok(v.auditLog, `${c.workspace}.${v.key}: auditLog should be true`);
        }
      }
    }
  });

  it('api has encryption-required secrets', () => {
    const api = getEnvSecretPhase5Contract('@qyou/api')!;
    assert.ok(api.vars.some(v => v.encryptionRequired));
    assert.ok(api.encryption.requireEncrypted);
    assert.ok(api.encryption.algorithm);
  });

  it('audit config present on all contracts', () => {
    for (const c of ENV_SECRET_PHASE5_CONTRACTS) {
      assert.ok(typeof c.audit.logAccess === 'boolean');
      assert.ok(typeof c.audit.logChanges === 'boolean');
      assert.ok(c.audit.retentionDays > 0);
    }
  });

  it('validateEnvSecretPhase5 passes for api', () => {
    const c = getEnvSecretPhase5Contract('@qyou/api')!;
    assert.equal(validateEnvSecretPhase5(c).length, 0);
  });

  it('validateEnvSecretPhase5 fails without rotation', () => {
    const c = getEnvSecretPhase5Contract('@qyou/api')!;
    const broken = { ...c, rotation: { ...c.rotation, enabled: false } };
    assert.ok(validateEnvSecretPhase5(broken).some(e => e.includes('rotation')));
  });
});
