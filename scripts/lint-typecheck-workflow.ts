import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface WorkflowPhase1Result {
  workspace: string;
  hasLintScript: boolean;
  hasTypecheckScript: boolean;
  hasTestScript: boolean;
  hasEslintConfig: boolean;
  hasTsconfig: boolean;
  errors: string[];
}

const ESLINT_CANDIDATES = ['eslint.config.mjs', '.eslintrc.js', '.eslintrc.json', '.eslintrc'];

function checkWorkspace(workspacePath: string, workspaceName: string): WorkflowPhase1Result {
  const errors: string[] = [];
  const pkgPath = resolve(workspacePath, 'package.json');

  const hasEslintConfig = ESLINT_CANDIDATES.some((f) => existsSync(resolve(workspacePath, f)));
  const hasTsconfig = existsSync(resolve(workspacePath, 'tsconfig.json'));

  let hasLintScript = false;
  let hasTypecheckScript = false;
  let hasTestScript = false;

  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const scripts: Record<string, string> = pkg.scripts || {};
      hasLintScript = 'lint' in scripts && !!scripts.lint.trim();
      hasTypecheckScript = 'typecheck' in scripts && !!scripts.typecheck.trim();
      hasTestScript = 'test' in scripts && !!scripts.test.trim();
    } catch {
      errors.push('package.json is invalid');
    }
  } else {
    errors.push('package.json not found');
  }

  if (!hasEslintConfig) errors.push('No ESLint config found');
  if (!hasTsconfig) errors.push('No tsconfig.json found');

  return { workspace: workspaceName, hasLintScript, hasTypecheckScript, hasTestScript, hasEslintConfig, hasTsconfig, errors };
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  const workspaceDirs: [string, string][] = [
    ...['api', 'web', 'mobile'].map((d) => [resolve(root, 'apps', d), `@qyou/${d}`] as [string, string]),
    ...['shared', 'stellar'].map((d) => [resolve(root, 'packages', d), `@qyou/${d}`] as [string, string]),
  ];

  for (const [wPath, wName] of workspaceDirs) {
    const result = checkWorkspace(wPath, wName);
    const status = result.errors.length === 0 ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${wName}: lint=${result.hasLintScript} typecheck=${result.hasTypecheckScript} test=${result.hasTestScript} eslint=${result.hasEslintConfig} tsconfig=${result.hasTsconfig}`);
    for (const err of result.errors) {
      console.error(`  ERROR: ${err}`);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('lint-typecheck-workflow.ts')) run();
