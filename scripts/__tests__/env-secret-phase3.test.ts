import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

interface EnvSecretPhase3Validation {
  missingRequired: string[];
  shortSecrets: string[];
  placeholderValues: string[];
  missingOptional: string[];
}

const PLACEHOLDER_PATTERNS = ['change-me', 'your-', 'CHANGE_ME', '<your', 'TODO', 'changeme', 'placeholder'];

function validateEnvContents(vars: Record<string, string>, contract: {
  required: string[];
  secrets: string[];
  optional: string[];
  minSecretLength: number;
}): EnvSecretPhase3Validation {
  const result: EnvSecretPhase3Validation = {
    missingRequired: [],
    shortSecrets: [],
    placeholderValues: [],
    missingOptional: [],
  };

  for (const key of contract.required) {
    if (!(key in vars)) result.missingRequired.push(key);
  }

  for (const key of contract.optional) {
    if (!(key in vars)) result.missingOptional.push(key);
  }

  for (const key of contract.secrets) {
    if (key in vars) {
      const val = vars[key];
      if (val.length < contract.minSecretLength) {
        result.shortSecrets.push(key);
      }
      if (PLACEHOLDER_PATTERNS.some((p) => val.toLowerCase().includes(p))) {
        result.placeholderValues.push(key);
      }
    }
  }

  return result;
}

const API_ENV_CONTRACT = {
  required: ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'],
  secrets: ['DATABASE_URL', 'JWT_SECRET'],
  optional: [],
  minSecretLength: 12,
};

const WEB_ENV_CONTRACT = {
  required: ['NEXT_PUBLIC_API_URL'],
  secrets: [],
  optional: [],
  minSecretLength: 8,
};

const MOBILE_ENV_CONTRACT = {
  required: [],
  secrets: [],
  optional: ['EXPO_PUBLIC_API_URL'],
  minSecretLength: 8,
};

describe('validateEnvContents — API contract', () => {
  it('passes with valid env', () => {
    const result = validateEnvContents({
      PORT: '4000',
      DATABASE_URL: 'postgresql://localhost:5432/qyou',
      JWT_SECRET: 'this-is-a-long-secret-key',
      JWT_EXPIRES_IN: '1h',
    }, API_ENV_CONTRACT);
    assert.deepEqual(result.missingRequired, []);
    assert.deepEqual(result.shortSecrets, []);
    assert.deepEqual(result.placeholderValues, []);
  });

  it('detects missing required vars', () => {
    const result = validateEnvContents({
      PORT: '4000',
    }, API_ENV_CONTRACT);
    assert.ok(result.missingRequired.includes('DATABASE_URL'));
    assert.ok(result.missingRequired.includes('JWT_SECRET'));
  });

  it('detects short secrets', () => {
    const result = validateEnvContents({
      PORT: '4000',
      DATABASE_URL: 'short',
      JWT_SECRET: 'tiny',
      JWT_EXPIRES_IN: '1h',
    }, API_ENV_CONTRACT);
    assert.ok(result.shortSecrets.includes('DATABASE_URL'));
    assert.ok(result.shortSecrets.includes('JWT_SECRET'));
  });

  it('detects placeholder values', () => {
    const result = validateEnvContents({
      PORT: '4000',
      DATABASE_URL: 'postgresql://localhost:5432/qyou',
      JWT_SECRET: 'dev-secret-change-me',
      JWT_EXPIRES_IN: '1h',
    }, API_ENV_CONTRACT);
    assert.ok(result.placeholderValues.includes('JWT_SECRET'));
  });
});

describe('validateEnvContents — web contract', () => {
  it('passes with valid web env', () => {
    const result = validateEnvContents({ NEXT_PUBLIC_API_URL: 'http://localhost:4000' }, WEB_ENV_CONTRACT);
    assert.deepEqual(result.missingRequired, []);
  });
});

describe('validateEnvContents — mobile contract', () => {
  it('allows missing optional vars', () => {
    const result = validateEnvContents({}, MOBILE_ENV_CONTRACT);
    assert.deepEqual(result.missingRequired, []);
    assert.deepEqual(result.shortSecrets, []);
  });
});
