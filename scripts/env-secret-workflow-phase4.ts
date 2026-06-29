import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { ENV_SECRET_PHASE4_CONTRACTS, getEnvSecretPhase4Contract } from './env-secret-contract-phase4.js';

interface EnvWorkflowResult {
  workspace: string;
  status: 'pass' | 'fail';
  errors: string[];
}

function checkEnvConfig(root: string): EnvWorkflowResult[] {
  const results: EnvWorkflowResult[] = [];

  const workspaces: [string, string][] = [
    ['', 'root'],
    ['apps/api', '@qyou/api'],
    ['apps/web', '@qyou/web'],
    ['apps/mobile', '@qyou/mobile'],
  ];

  for (const [wPath, wName] of workspaces) {
    const contract = getEnvSecretPhase4Contract(wName);
    if (!contract) {
      results.push({ workspace: wName, status: 'fail', errors: ['No Phase 4 env contract defined'] });
      continue;
    }

    const errors: string[] = [];
    const envExamplePath = resolve(root, contract.envExampleFile);

    if (contract.requireExample && !existsSync(envExamplePath)) {
      errors.push(`.env.example file not found: ${contract.envExampleFile}`);
    } else if (existsSync(envExamplePath)) {
      const content = readFileSync(envExamplePath, 'utf-8');
      for (const v of contract.vars) {
        if (v.required && !content.includes(v.key)) {
          errors.push(`Required env var "${v.key}" not found in .env.example`);
        }
      }
    }

    const gitignorePath = resolve(root, '.gitignore');
    if (contract.requireGitignore && existsSync(gitignorePath)) {
      const gitignore = readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('.env')) {
        errors.push('.gitignore does not reference .env files');
      }
    }

    const envPath = resolve(root, wPath || '.', '.env');
    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8');
      for (const v of contract.vars) {
        if (v.secret && envContent.includes(v.key)) {
          const match = envContent.match(new RegExp(`${v.key}=(.+)`));
          if (match && match[1] && !['your-secret', 'changeme', 'placeholder'].some((p) => match[1].toLowerCase().includes(p))) {
            if (match[1].length < contract.secretMinLength) {
              errors.push(`Secret "${v.key}" value length ${match[1].length} < minimum ${contract.secretMinLength}`);
            }
          }
        }
      }
    }

    results.push({ workspace: wName, status: errors.length === 0 ? 'pass' : 'fail', errors });
  }

  return results;
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  const results = checkEnvConfig(root);
  let exitCode = 0;

  for (const r of results) {
    console.log(`[${r.status.toUpperCase()}] ${r.workspace}`);
    for (const e of r.errors) {
      console.error(`  ERROR: ${e}`);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('env-secret-workflow-phase4.ts')) run();
