import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ENV_CONFIG_CONTRACTS, validateEnvFile } from './env-config-contract.js';

interface WorkflowResult {
  workspace: string;
  status: 'pass' | 'fail' | 'skip';
  errors: string[];
  warnings: string[];
}

function parseEnvFile(path: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!existsSync(path)) return vars;

  const content = readFileSync(path, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key) vars[key] = val;
  }
  return vars;
}

function parseEnvExample(path: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!existsSync(path)) return vars;

  const content = readFileSync(path, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key) vars[key] = val;
  }
  return vars;
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  for (const contract of ENV_CONFIG_CONTRACTS) {
    const envPath = resolve(root, contract.envFile.replace('.env.example', '.env'));
    const examplePath = resolve(root, contract.envFile);
    const actualVars = parseEnvFile(envPath);

    const result = validateEnvFile(contract.workspace, actualVars);

    // Also check that .env.example stays in sync
    const exampleVars = parseEnvExample(examplePath);
    const contractKeys = contract.vars.map((v) => v.key);
    const exampleKeys = Object.keys(exampleVars);
    const missingInExample = contractKeys.filter((k) => !exampleKeys.includes(k));

    if (missingInExample.length > 0) {
      for (const k of missingInExample) {
        console.warn(`WARN: ${contract.workspace} — "${k}" defined in contract but missing from .env.example`);
      }
    }

    for (const err of result.errors) {
      console.error(`ERROR: ${contract.workspace} — ${err}`);
      exitCode = 1;
    }
    for (const warn of result.warnings) {
      console.warn(`WARN: ${contract.workspace} — ${warn}`);
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('env-secret-workflow.ts')) run();
