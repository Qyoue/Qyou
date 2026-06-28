import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  validatePackageJson,
  checkTsconfigExtends,
  formatValidationResults,
  type ValidationResult,
} from '../workspace-schema.js';

describe('validatePackageJson', () => {
  const validPkg = {
    name: '@qyou/valid',
    version: '0.1.0',
    private: true,
    scripts: {
      typecheck: 'tsc --noEmit',
      lint: 'eslint .',
      test: 'jest',
      build: 'tsc',
    },
    dependencies: { '@qyou/shared': '*' },
    devDependencies: { '@qyou/stellar': '*' },
  };

  it('passes a valid package with build', () => {
    const result = validatePackageJson(validPkg, 'packages/valid', true);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('passes a valid package without build', () => {
    const { scripts, ...noBuild } = validPkg;
    const { build: _, ...rest } = scripts as Record<string, string>;
    const result = validatePackageJson(
      { ...noBuild, scripts: rest },
      'apps/test',
      false,
    );
    assert.equal(result.valid, true);
  });

  it('fails on missing private field', () => {
    const { private: _, ...noPrivate } = validPkg;
    const result = validatePackageJson(noPrivate, 'packages/test', true);
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.includes('private')));
  });

  it('fails on missing required scripts', () => {
    const result = validatePackageJson(
      { ...validPkg, scripts: {} },
      'packages/test',
      true,
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('typecheck')));
    assert.ok(result.errors.some((e) => e.includes('lint')));
    assert.ok(result.errors.some((e) => e.includes('test')));
    assert.ok(result.errors.some((e) => e.includes('build')));
  });

  it('fails on non-star internal dependency', () => {
    const badDeps = { ...validPkg, dependencies: { '@qyou/shared': '^0.1.0' } };
    const result = validatePackageJson(badDeps, 'packages/test', true);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('@qyou/shared')));
  });

  it('warns on non-@qyou package name', () => {
    const result = validatePackageJson(
      { ...validPkg, name: 'some-other-name' },
      'packages/test',
      true,
    );
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((w) => w.includes('@qyou/*')));
  });
});

describe('checkTsconfigExtends', () => {
  it('returns true when extending base', () => {
    assert.equal(checkTsconfigExtends({ extends: '../../tsconfig.base.json' }, 'test'), true);
  });

  it('returns false when no extends', () => {
    assert.equal(checkTsconfigExtends({ compilerOptions: {} }, 'test'), false);
  });

  it('returns false when extends is unrelated', () => {
    assert.equal(checkTsconfigExtends({ extends: 'expo/tsconfig.base' }, 'test'), false);
  });
});

describe('formatValidationResults', () => {
  it('formats errors and warnings', () => {
    const results = new Map<string, ValidationResult>();
    results.set('apps/test', { valid: false, errors: ['missing script "test"'], warnings: [] });
    results.set('packages/ok', { valid: true, errors: [], warnings: [] });
    results.set('packages/warn', { valid: true, errors: [], warnings: ['not private'] });

    const output = formatValidationResults(results);
    assert.ok(output.includes('ERROR'));
    assert.ok(output.includes('missing script'));
    assert.ok(output.includes('WARN'));
    assert.ok(output.includes('not private'));
  });
});
