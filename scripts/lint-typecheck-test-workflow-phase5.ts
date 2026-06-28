import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

interface LintTypecheckTestResult {
  workspace: string;
  status: 'pass' | 'fail';
  errors: string[];
}

const WORKSPACE_TS_CONFIGS: Record<string, string> = {
  '@qyou/api': 'apps/api/tsconfig.json',
  '@qyou/web': 'apps/web/tsconfig.json',
  '@qyou/mobile': 'apps/mobile/tsconfig.json',
  '@qyou/shared': 'packages/shared/tsconfig.json',
  '@qyou/stellar': 'packages/stellar/tsconfig.json',
};

const REQUIRED_STRICT_RULES = ['strict', 'noUnusedLocals', 'noUnusedParameters', 'strictNullChecks'];

function checkTsconfig(path: string, workspace: string): LintTypecheckTestResult {
  const errors: string[] = [];
  if (!existsSync(path)) {
    errors.push('tsconfig.json not found');
    return { workspace, status: 'fail', errors };
  }
  try {
    const config = JSON.parse(readFileSync(path, 'utf-8'));
    const compilerOptions = config.compilerOptions || {};
    for (const rule of REQUIRED_STRICT_RULES) {
      if (compilerOptions[rule] !== true) {
        errors.push(`Missing strict rule: ${rule}`);
      }
    }
  } catch {
    errors.push('tsconfig.json is not valid JSON');
  }
  return { workspace, status: errors.length === 0 ? 'pass' : 'fail', errors };
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  for (const [workspace, tsPath] of Object.entries(WORKSPACE_TS_CONFIGS)) {
    const path = resolve(root, tsPath);
    const result = checkTsconfig(path, workspace);

    const testDir = resolve(root, 'scripts', '__tests__');
    if (existsSync(testDir)) {
      const testFiles = readdirSync(testDir).filter(f => f.endsWith('.test.ts'));
      if (testFiles.length === 0) {
        result.errors.push('No test files found');
      }
    }

    console.log(`[${result.status.toUpperCase()}] ${workspace}`);
    for (const err of result.errors) {
      console.error(`  ERROR: ${err}`);
      exitCode = 1;
    }
  }

  if (exitCode === 0) {
    console.log('All lint, typecheck, and test ergonomics pass.');
  }
  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('lint-typecheck-test-workflow-phase5.ts')) run();
