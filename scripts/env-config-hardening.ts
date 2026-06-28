import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

interface HardeningResult {
  workspace: string;
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

function checkPlaceholderValues(vars: Record<string, string>): string[] {
  const warnings: string[] = [];
  const placeholderPatterns = ['change-me', 'your-', 'CHANGE_ME', '<your', 'TODO', 'changeme'];
  for (const [key, val] of Object.entries(vars)) {
    if (placeholderPatterns.some((p) => val.toLowerCase().includes(p))) {
      warnings.push(`${key} contains placeholder value: "${val}"`);
    }
  }
  return warnings;
}

function checkSecretExposure(vars: Record<string, string>): string[] {
  const warnings: string[] = [];
  const secretKeys = ['secret', 'password', 'token', 'key', 'auth', 'private', 'jwt'];
  for (const [key, val] of Object.entries(vars)) {
    if (!val) continue;
    const isSecret = secretKeys.some((s) => key.toLowerCase().includes(s));
    if (isSecret && val.length < 8) {
      warnings.push(`${key} is a secret but only ${val.length} chars long (min 8)`);
    }
    if (isSecret && val.startsWith('dev-')) {
      warnings.push(`${key} uses dev prefix — ensure it is changed in production`);
    }
  }
  return warnings;
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  const envTargets: { dir: string; name: string }[] = [
    ...['api', 'web', 'mobile'].map((d) => ({ dir: resolve(root, 'apps', d), name: `@qyou/${d}` })),
  ];

  for (const target of envTargets) {
    const envPath = resolve(target.dir, '.env');
    const examplePath = resolve(target.dir, '.env.example');
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check .env.example exists
    if (!existsSync(examplePath)) {
      errors.push('.env.example not found');
    }

    // Check .env is gitignored
    const gitignorePath = resolve(target.dir, '.gitignore');
    if (existsSync(gitignorePath)) {
      const gi = readFileSync(gitignorePath, 'utf-8');
      if (!gi.includes('.env')) {
        warnings.push('.gitignore does not contain .env entry');
      }
    } else {
      warnings.push('.gitignore not found in workspace');
    }

    if (existsSync(envPath)) {
      const envVars = parseEnv(envPath);
      warnings.push(...checkPlaceholderValues(envVars));
      warnings.push(...checkSecretExposure(envVars));
    }

    // Cross-check: vars in .env.example that are not gitignored should have defaults
    if (existsSync(examplePath)) {
      const exampleVars = parseEnv(examplePath);
      for (const [key, val] of Object.entries(exampleVars)) {
        if (!val && existsSync(envPath)) {
          const actualVars = parseEnv(envPath);
          if (!(key in actualVars)) {
            warnings.push(`${key} has no default in .env.example and is not set in .env`);
          }
        }
      }
    }

    for (const err of errors) {
      console.error(`ERROR: ${target.name} — ${err}`);
      exitCode = 1;
    }
    for (const warn of warnings) {
      console.warn(`WARN: ${target.name} — ${warn}`);
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('env-config-hardening.ts')) main();
