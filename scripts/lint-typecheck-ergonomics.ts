import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface WorkspaceResult {
  workspace: string;
  hasLint: boolean;
  hasTypecheck: boolean;
  hasTest: boolean;
  errors: string[];
  warnings: string[];
}

function readPackageScripts(dir: string): Record<string, string> {
  const pkgPath = resolve(dir, 'package.json');
  if (!existsSync(pkgPath)) return {};
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.scripts || {};
  } catch {
    return {};
  }
}

function checkRootScripts(): WorkspaceResult[] {
  const root = resolve(import.meta.dirname, '..');
  const results: WorkspaceResult[] = [];

  const workspaceDirs: [string, string][] = [
    ...['api', 'web', 'mobile'].map((d) => [resolve(root, 'apps', d), `@qyou/${d}`] as [string, string]),
    ...['shared', 'stellar'].map((d) => [resolve(root, 'packages', d), `@qyou/${d}`] as [string, string]),
  ];

  for (const [wPath, wName] of workspaceDirs) {
    const scripts = readPackageScripts(wPath);
    const result: WorkspaceResult = {
      workspace: wName,
      hasLint: 'lint' in scripts,
      hasTypecheck: 'typecheck' in scripts,
      hasTest: 'test' in scripts,
      errors: [],
      warnings: [],
    };

    // Check that scripts are non-empty
    if (result.hasLint && !scripts.lint.trim()) {
      result.errors.push('lint script is empty');
    }
    if (result.hasTypecheck && !scripts.typecheck.trim()) {
      result.errors.push('typecheck script is empty');
    }
    if (result.hasTest && !scripts.test.trim()) {
      result.errors.push('test script is empty');
    }

    // Check that shared/packages workspaces at least have minimal tooling
    if (wName === '@qyou/shared' || wName === '@qyou/stellar') {
      if (!result.hasLint) result.warnings.push('no lint script (common for shared packages)');
      if (!result.hasTypecheck) result.warnings.push('no typecheck script');
    }

    results.push(result);
  }

  return results;
}

function run(): void {
  const results = checkRootScripts();
  let exitCode = 0;

  for (const r of results) {
    const status = r.errors.length > 0 ? 'FAIL' : r.warnings.length > 0 ? 'WARN' : 'PASS';
    console.log(`[${status}] ${r.workspace}: lint=${r.hasLint} typecheck=${r.hasTypecheck} test=${r.hasTest}`);
    for (const e of r.errors) {
      console.error(`  ERROR: ${e}`);
      exitCode = 1;
    }
    for (const w of r.warnings) {
      console.warn(`  WARN: ${w}`);
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('lint-typecheck-ergonomics.ts')) run();
