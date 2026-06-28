import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface EnvSecretResult {
  workspace: string;
  status: 'pass' | 'fail';
  errors: string[];
}

const ENV_CONFIGS: Record<string, { envFile: string; exampleFile: string }> = {
  '@qyou/api': { envFile: 'apps/api/.env', exampleFile: 'apps/api/.env.example' },
  '@qyou/web': { envFile: 'apps/web/.env', exampleFile: 'apps/web/.env.example' },
  '@qyou/mobile': { envFile: 'apps/mobile/.env', exampleFile: 'apps/mobile/.env.example' },
  'root': { envFile: '.env', exampleFile: '.env.example' },
};

const REQUIRED_API_VARS = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
const SECRET_SUFFIXES = ['_SECRET', '_KEY', '_TOKEN', '_PASSWORD', '_URL'];

function validateEnv(envPath: string, examplePath: string, workspace: string, requiredVars: string[]): EnvSecretResult {
  const errors: string[] = [];
  const envExists = existsSync(envPath);
  const exampleExists = existsSync(examplePath);

  if (!envExists && workspace !== 'root') errors.push(`Missing env file`);
  if (!exampleExists) errors.push(`Missing .env.example`);

  if (envExists && exampleExists) {
    const env = readFileSync(envPath, 'utf-8');
    const example = readFileSync(examplePath, 'utf-8');
    const envVars = env.split('\n').filter(l => l.includes('=')).map(l => l.split('=')[0].trim());
    const exampleVars = example.split('\n').filter(l => l.includes('=')).map(l => l.split('=')[0].trim());

    for (const key of requiredVars) {
      if (!envVars.includes(key)) errors.push(`Required var missing: ${key}`);
      if (!exampleVars.includes(key)) errors.push(`Required var missing from .env.example: ${key}`);
    }

    for (const ev of envVars) {
      if (SECRET_SUFFIXES.some(s => ev.includes(s))) {
        const val = env.split('\n').filter(l => l.startsWith(ev))[0]?.split('=')[1] || '';
        if (val.length < 16) errors.push(`Secret ${ev}: too short (${val.length})`);
      }
    }
  }

  if (workspace === 'root' && existsSync('.gitignore')) {
    const gi = readFileSync('.gitignore', 'utf-8');
    if (!gi.includes('.env')) errors.push('.gitignore does not mention .env');
  }

  return { workspace, status: errors.length === 0 ? 'pass' : 'fail', errors };
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  for (const [workspace, config] of Object.entries(ENV_CONFIGS)) {
    const envPath = resolve(root, config.envFile);
    const examplePath = resolve(root, config.exampleFile);
    const requiredVars = workspace === '@qyou/api' ? REQUIRED_API_VARS : [];
    const result = validateEnv(envPath, examplePath, workspace, requiredVars);
    console.log(`[${result.status.toUpperCase()}] ${workspace}`);
    for (const err of result.errors) {
      console.error(`  ERROR: ${err}`);
      exitCode = 1;
    }
  }

  if (exitCode === 0) {
    console.log('All env config and secrets validated.');
  }
  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('env-secret-workflow-phase5.ts')) run();
