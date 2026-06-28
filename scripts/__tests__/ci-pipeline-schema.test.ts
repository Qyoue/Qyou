import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateCiPipeline, type CiJob } from '../ci-pipeline-schema.js';

describe('validateCiPipeline', () => {
  const validJob: CiJob = {
    name: 'test-job',
    runsOn: 'ubuntu-latest',
    steps: [
      { name: 'Setup Node', uses: 'actions/setup-node@v4', with: { 'node-version': '20' } },
      { name: 'typecheck', run: 'npm run typecheck' },
      { name: 'lint', run: 'npm run lint' },
      { name: 'test', run: 'npm run test' },
      { name: 'build', run: 'npm run build' },
    ],
    needsTypeCheck: true,
    needsLint: true,
    needsTest: true,
    needsBuild: true,
  };

  it('passes a valid job with all required steps', () => {
    const result = validateCiPipeline([validJob]);
    assert.equal(result.valid, true);
    assert.equal(result.errors.length, 0);
  });

  it('fails when missing typecheck', () => {
    const { typecheck: _, ...restSteps } = Object.fromEntries(
      validJob.steps.map((s) => [s.name.toLowerCase(), s]),
    );
    const noTypeCheckJob: CiJob = {
      ...validJob,
      steps: validJob.steps.filter((s) => !s.name.includes('typecheck')),
    };
    const result = validateCiPipeline([noTypeCheckJob]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('typecheck')));
  });

  it('fails when missing lint', () => {
    const noLintJob: CiJob = {
      ...validJob,
      steps: validJob.steps.filter((s) => !s.name.includes('lint')),
    };
    const result = validateCiPipeline([noLintJob]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('lint')));
  });

  it('fails when missing test', () => {
    const noTestJob: CiJob = {
      ...validJob,
      steps: validJob.steps.filter((s) => !s.name.includes('test')),
    };
    const result = validateCiPipeline([noTestJob]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('test')));
  });

  it('fails when missing build', () => {
    const noBuildJob: CiJob = {
      ...validJob,
      needsBuild: true,
      steps: validJob.steps.filter((s) => !s.name.includes('build')),
    };
    const result = validateCiPipeline([noBuildJob]);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes('build')));
  });

  it('passes a minimal job without optional steps', () => {
    const minimal: CiJob = {
      name: 'minimal',
      runsOn: 'ubuntu-latest',
      steps: [{ name: 'Checkout', uses: 'actions/checkout@v4' }],
      needsTypeCheck: false,
      needsLint: false,
      needsTest: false,
      needsBuild: false,
    };
    const result = validateCiPipeline([minimal]);
    assert.equal(result.valid, true);
  });

  it('fails when runsOn is empty', () => {
    const bad: CiJob = { ...validJob, runsOn: '' };
    const result = validateCiPipeline([bad]);
    assert.equal(result.valid, false);
  });
});
