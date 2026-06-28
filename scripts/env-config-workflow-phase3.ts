import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ENV_CONTRACTS_PHASE3, getEnvContractPhase3 } from './env-config-contract-phase3.js';

interface Phase3Result {
  workspace: string;
  status: 'pass' | 'fail';
  errors: string[];
  warnings: string[];
}

function parseEnv(path: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!existsSync(path)) return vars;
  const content = readFileSync(path, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eqIdx = trimmed.indexOf('=');
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key) vars[key] = val;
  }
  return vars;
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  for (const contract of ENV_CONTRACTS_PHASE3) {
    const errors: string[] = [];
    const warnings: string[] = [];

    const envPath = resolve(root, contract.envFile);
    const examplePath = resolve(root, contract.envExampleFile);
    const gitignorePath = resolve(root, contract.envFile.replace('.env', '.gitignore').replace('apps/', ''));

    // Check .env.example exists
    if (contract.validation.requireExample && !existsSync(examplePath)) {
      errors.push('.env.example is missing');
    }

    // Check .env is gitignored
    if (contract.validation.requireGitignore) {
      if (existsSync(gitignorePath)) {
        const gi = readFileSync(gitignorePath, 'utf-8');
        if (!gi.includes('.env')) {
          warnings.push('.env not listed in .gitignore');
        }
      } else {
        warnings.push('.gitignore not found');
      }
    }

    // Validate .env vars against contract
    const envVars = parseEnv(envPath);
    const exampleVars = parseEnv(examplePath);

    for (const def of contract.vars) {
      const inEnv = def.key in envVars;
      const inExample = def.key in exampleVars;

      if (def.required && !inExample) {
        errors.push(`"${def.key}" is required but missing from .env.example`);
      }

      if (def.required && !inEnv && existsSync(envPath)) {
        errors.push(`"${def.key}" is required but missing from .env`);
      }

      if (def.secret && inEnv) {
        const val = envVars[def.key];
        if (val.length < contract.validation.minSecretLength) {
          errors.push(`"${def.key}" is too short (${val.length} chars, min ${contract.validation.minSecretLength})`);
        }
      }

      if (def.format && inExample) {
        const val = exampleVars[def.key];
        if (def.format === 'number' && val && isNaN(Number(val))) {
          warnings.push(`"${def.key}" should be a number but has value "${val}"`);
        }
        if (def.format === 'url' && val && !val.startsWith('http')) {
          warnings.push(`"${def.key}" should be a URL but has value "${val}"`);
        }
      }
    }

    const status = errors.length > 0 ? 'fail' : 'pass';
    if (status === 'fail') exitCode = 1;

    for (const err of errors) console.error(`ERROR: ${contract.workspace} — ${err}`);
    for (const warn of warnings) console.warn(`WARN: ${contract.workspace} — ${warn}`);
    console.log(`[${status.toUpperCase()}] ${contract.workspace}`);
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('env-config-workflow-phase3.ts')) run();
