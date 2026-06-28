import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface HardeningResult {
  workspace: string;
  status: 'pass' | 'fail' | 'recovered';
  errors: string[];
  recommendations: string[];
}

const ENV_CONFIGS: Record<string, { envFile: string; exampleFile: string; gitignoreDir: string }> = {
  '@qyou/api': { envFile: 'apps/api/.env', exampleFile: 'apps/api/.env.example', gitignoreDir: 'apps/api' },
  '@qyou/web': { envFile: 'apps/web/.env', exampleFile: 'apps/web/.env.example', gitignoreDir: 'apps/web' },
  '@qyou/mobile': { envFile: 'apps/mobile/.env', exampleFile: 'apps/mobile/.env.example', gitignoreDir: 'apps/mobile' },
};

function checkSecretStrength(val: string): string[] {
  const issues: string[] = [];
  if (val.length < 16) issues.push('too short (< 16 chars)');
  if (!/[A-Z]/.test(val)) issues.push('missing uppercase letter');
  if (!/[a-z]/.test(val)) issues.push('missing lowercase letter');
  if (!/[0-9]/.test(val)) issues.push('missing digit');
  if (!/[^A-Za-z0-9]/.test(val)) issues.push('missing special character');
  return issues;
}

function hardenEnv(workspace: string, config: { envFile: string; exampleFile: string; gitignoreDir: string }): HardeningResult {
  const errors: string[] = [];
  const recommendations: string[] = [];
  const root = resolve(import.meta.dirname, '..');
  const envPath = resolve(root, config.envFile);
  const examplePath = resolve(root, config.exampleFile);

  if (!existsSync(envPath)) {
    errors.push(`Missing .env: ${config.envFile}`);
  }

  if (!existsSync(examplePath)) {
    errors.push(`Missing .env.example: ${config.exampleFile}`);
  }

  if (existsSync(envPath) && existsSync(examplePath)) {
    const env = readFileSync(envPath, 'utf-8');
    const example = readFileSync(examplePath, 'utf-8');

    const envKeys = env.split('\n').filter(l => l.includes('=')).reduce((acc, l) => { const [k, ...v] = l.split('='); acc[k.trim()] = v.join('='); return acc; }, {} as Record<string, string>);
    const exampleKeys = example.split('\n').filter(l => l.includes('=')).reduce((acc, l) => { const [k] = l.split('='); acc[k.trim()] = true; return acc; }, {} as Record<string, boolean>);

    for (const key of Object.keys(envKeys)) {
      if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('token') || key.toLowerCase().includes('password') || key.toLowerCase().includes('key')) {
        const val = envKeys[key];
        if (val) {
          const issues = checkSecretStrength(val);
          for (const issue of issues) {
            recommendations.push(`${workspace}: ${key} secret strength issue: ${issue}`);
          }
        }
      }
      if (!(key in exampleKeys)) {
        recommendations.push(`${workspace}: ${key} exists in .env but not in .env.example`);
      }
    }

    for (const key of Object.keys(exampleKeys)) {
      if (!(key in envKeys)) {
        recommendations.push(`${workspace}: ${key} exists in .env.example but not in .env`);
      }
    }
  }

  const giPath = resolve(root, config.gitignoreDir, '.gitignore');
  if (!existsSync(giPath)) {
    recommendations.push(`${workspace}: no local .gitignore, env files might be tracked`);
  }

  return {
    workspace,
    status: errors.length === 0 ? (recommendations.length > 0 ? 'recovered' : 'pass') : 'fail',
    errors,
    recommendations,
  };
}

function run(): void {
  let exitCode = 0;
  for (const [workspace, config] of Object.entries(ENV_CONFIGS)) {
    const result = hardenEnv(workspace, config);
    console.log(`[${result.status.toUpperCase()}] ${workspace}`);
    for (const err of result.errors) { console.error(`  ERROR: ${err}`); exitCode = 1; }
    for (const rec of result.recommendations) { console.log(`  RECOMMEND: ${rec}`); }
  }
  if (exitCode === 0) console.log('Env/secret hardening complete.');
  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('env-secret-hardening-phase5.ts')) run();
