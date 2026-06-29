import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getPhase4Contract, PHASE4_CONTRACTS, validatePhase4Contract } from '../workspace-scripts-contract-phase4.js';

describe('getPhase4Contract', () => {
  it('returns contract for root', () => {
    const c = getPhase4Contract('root');
    assert.ok(c);
    assert.equal(c?.workspace, 'root');
  });

  it('returns contract for @qyou/api', () => {
    const c = getPhase4Contract('@qyou/api');
    assert.ok(c);
    assert.ok(c?.scripts.some((s) => s.name === 'build' && s.required));
  });

  it('returns undefined for unknown workspace', () => {
    assert.equal(getPhase4Contract('@qyou/unknown'), undefined);
  });
});

describe('PHASE4_CONTRACTS', () => {
  it('has all workspace contracts', () => {
    const workspaces = ['root', '@qyou/api', '@qyou/web', '@qyou/mobile', '@qyou/shared', '@qyou/stellar'];
    for (const ws of workspaces) {
      assert.ok(PHASE4_CONTRACTS.some((c) => c.workspace === ws), `Missing contract for ${ws}`);
    }
  });

  it('all contracts have scripts defined', () => {
    for (const c of PHASE4_CONTRACTS) {
      assert.ok(c.scripts.length > 0, `${c.workspace} has no scripts`);
    }
  });

  it('all required scripts have non-empty commands', () => {
    for (const c of PHASE4_CONTRACTS) {
      for (const s of c.scripts) {
        if (s.required) {
          assert.ok(s.command, `${c.workspace}: required script "${s.name}" missing command`);
        }
      }
    }
  });

  it('root has build, dev, lint, typecheck, test scripts', () => {
    const root = PHASE4_CONTRACTS.find((c) => c.workspace === 'root')!;
    const requiredScripts = ['build', 'dev', 'lint', 'typecheck', 'test'];
    for (const name of requiredScripts) {
      assert.ok(root.scripts.some((s) => s.name === name), `Root missing script "${name}"`);
    }
  });
});

describe('validatePhase4Contract', () => {
  it('passes for valid contract', () => {
    const root = getPhase4Contract('root')!;
    assert.equal(validatePhase4Contract(root).length, 0);
  });

  it('fails if no scripts defined', () => {
    const broken = { ...getPhase4Contract('root')!, scripts: [] };
    const errors = validatePhase4Contract(broken);
    assert.ok(errors.some((e) => e.includes('no scripts defined')));
  });

  it('fails if required script has no command', () => {
    const c = getPhase4Contract('@qyou/api')!;
    const broken = { ...c, scripts: c.scripts.map((s) => s.name === 'build' ? { ...s, command: '' } : s) };
    const errors = validatePhase4Contract(broken);
    assert.ok(errors.some((e) => e.includes('required script "build"')));
  });
});
