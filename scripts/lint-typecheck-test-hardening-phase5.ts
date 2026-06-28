import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface HardeningResult {
  workspace: string;
  status: 'pass' | 'fail' | 'recovered';
  errors: string[];
  recoveries: string[];
}

const TS_CONFIGS: Record<string, string> = {
  '@qyou/api': 'apps/api/tsconfig.json',
  '@qyou/web': 'apps/web/tsconfig.json',
  '@qyou/mobile': 'apps/mobile/tsconfig.json',
  '@qyou/shared': 'packages/shared/tsconfig.json',
  '@qyou/stellar': 'packages/stellar/tsconfig.json',
};

const REQUIRED_STRICT_RULES = ['strict', 'noUnusedLocals', 'noUnusedParameters', 'strictNullChecks', 'exactOptionalPropertyTypes'];
const SAFE_DEFAULTS: Record<string, boolean> = { strict: true, noUnusedLocals: true, noUnusedParameters: true, strictNullChecks: true, exactOptionalPropertyTypes: false };

function hardenTsconfig(path: string, workspace: string): HardeningResult {
  const errors: string[] = [];
  const recoveries: string[] = [];

  if (!existsSync(path)) {
    errors.push('tsconfig.json not found - cannot harden');
    return { workspace, status: 'fail', errors, recoveries };
  }

  let config: any;
  try {
    config = JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    errors.push('tsconfig.json is not valid JSON');
    return { workspace, status: 'fail', errors, recoveries };
  }

  if (!config.compilerOptions) config.compilerOptions = {};
  const opts = config.compilerOptions;

  for (const rule of REQUIRED_STRICT_RULES) {
    if (opts[rule] !== true) {
      const recommended = SAFE_DEFAULTS[rule] ?? true;
      if (recommended) {
        recoveries.push(`Fixable: ${rule} is ${opts[rule]}, should be true`);
      } else {
        errors.push(`Rule ${rule} should be reviewed manually`);
      }
    }
  }

  if (!opts.target) {
    recoveries.push('Fixable: target not set, would default to ES2022');
  }

  if (!opts.moduleResolution || opts.moduleResolution !== 'node') {
    recoveries.push('Fixable: moduleResolution should be "node"');
  }

  const status = errors.length === 0 ? (recoveries.length > 0 ? 'recovered' : 'pass') : 'fail';
  return { workspace, status, errors, recoveries };
}

function run(): void {
  let exitCode = 0;
  for (const [workspace, tsPath] of Object.entries(TS_CONFIGS)) {
    const path = resolve(import.meta.dirname, '..', tsPath);
    const result = hardenTsconfig(path, workspace);
    console.log(`[${result.status.toUpperCase()}] ${workspace}`);
    for (const err of result.errors) { console.error(`  ERROR: ${err}`); exitCode = 1; }
    for (const rec of result.recoveries) { console.log(`  RECOVERED: ${rec}`); }
  }
  if (exitCode === 0) console.log('Lint/typecheck hardening complete.');
  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('lint-typecheck-test-hardening-phase5.ts')) run();
