import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface HardeningReport {
  workspace: string;
  errors: string[];
  warnings: string[];
}

function checkConfigFile(path: string, name: string): string[] {
  const warnings: string[] = [];
  if (!existsSync(path)) {
    warnings.push(`${name} not found`);
    return warnings;
  }
  const content = readFileSync(path, 'utf-8');
  if (content.trim().length === 0) {
    warnings.push(`${name} is empty`);
  }
  return warnings;
}

function checkScriptConfig(workspacePath: string, workspaceName: string): HardeningReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check tsconfig.json exists
  warnings.push(...checkConfigFile(resolve(workspacePath, 'tsconfig.json'), 'tsconfig.json'));

  // Check eslint config exists (could be eslint.config.mjs, .eslintrc.js, etc.)
  const eslintCandidates = ['eslint.config.mjs', '.eslintrc.js', '.eslintrc.json', '.eslintrc'];
  const hasEslint = eslintCandidates.some((f) => existsSync(resolve(workspacePath, f)));
  if (!hasEslint) {
    warnings.push('no ESLint config found');
  }

  // Check package.json scripts
  const pkgPath = resolve(workspacePath, 'package.json');
  if (!existsSync(pkgPath)) {
    errors.push('package.json not found');
    return { workspace: workspaceName, errors, warnings };
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    errors.push('package.json is invalid JSON');
    return { workspace: workspaceName, errors, warnings };
  }

  const scripts: Record<string, string> = (pkg.scripts as Record<string, string>) || {};

  if ('lint' in scripts && !scripts.lint.trim()) errors.push('lint script is empty');
  if ('typecheck' in scripts && !scripts.typecheck.trim()) errors.push('typecheck script is empty');
  if ('test' in scripts && !scripts.test.trim()) errors.push('test script is empty');

  return { workspace: workspaceName, errors, warnings };
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  const workspaceDirs: [string, string][] = [
    ...['api', 'web', 'mobile'].map((d) => [resolve(root, 'apps', d), `@qyou/${d}`] as [string, string]),
    ...['shared', 'stellar'].map((d) => [resolve(root, 'packages', d), `@qyou/${d}`] as [string, string]),
  ];

  for (const [wPath, wName] of workspaceDirs) {
    const report = checkScriptConfig(wPath, wName);
    for (const err of report.errors) {
      console.error(`ERROR: ${wName} — ${err}`);
      exitCode = 1;
    }
    for (const warn of report.warnings) {
      console.warn(`WARN: ${wName} — ${warn}`);
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('lint-typecheck-hardening.ts')) main();
