import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

interface CiPipelineValidationTest {
  name: string;
  workflow: string;
  check: string;
  pass: boolean;
}

function checkContentHas(content: string, needle: string): boolean {
  return content.includes(needle);
}

function checkInstallBeforeLint(content: string): boolean {
  const install = content.indexOf('name: Install dependencies');
  const lint = content.indexOf('name: Lint');
  if (install === -1 || lint === -1) return true;
  return install < lint;
}

function checkNoNpmInstall(content: string): boolean {
  return !content.includes('npm install');
}

describe('CI pipeline validation helpers', () => {
  it('checkContentHas finds a string', () => {
    assert.equal(checkContentHas('hello world', 'hello'), true);
  });

  it('checkContentHas returns false for missing string', () => {
    assert.equal(checkContentHas('hello world', 'goodbye'), false);
  });

  it('checkInstallBeforeLint passes when install first', () => {
    const content = `- name: Install dependencies
  run: npm ci
- name: Lint
  run: lint`;
    assert.equal(checkInstallBeforeLint(content), true);
  });

  it('checkInstallBeforeLint fails when lint first', () => {
    const content = `- name: Lint
  run: lint
- name: Install dependencies
  run: npm ci`;
    assert.equal(checkInstallBeforeLint(content), false);
  });

  it('checkNoNpmInstall passes for npm ci only', () => {
    assert.equal(checkNoNpmInstall('run: npm ci'), true);
  });

  it('checkNoNpmInstall fails when npm install present', () => {
    assert.equal(checkNoNpmInstall('run: npm install'), false);
  });
});
