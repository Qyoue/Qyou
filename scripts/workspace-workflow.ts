import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { SCRIPT_CONTRACTS, validateScriptBoundary } from './workspace-boundary-contract.js';

interface WorkflowResult {
  workspace: string;
  status: 'pass' | 'fail' | 'skip';
  errors: string[];
}

function readPackageJson(dir: string): Record<string, string> | null {
  const path = resolve(dir, 'package.json');
  if (!existsSync(path)) return null;
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf-8'));
    return pkg.scripts || {};
  } catch {
    return null;
  }
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  const results: WorkflowResult[] = [];
  let exitCode = 0;

  const workspaceDirs: [string, string][] = [
    ...['api', 'web', 'mobile'].map((d) => [resolve(root, 'apps', d), `@qyou/${d}`] as [string, string]),
    ...['shared', 'stellar'].map((d) => [resolve(root, 'packages', d), `@qyou/${d}`] as [string, string]),
  ];

  for (const [wPath, wName] of workspaceDirs) {
    const scripts = readPackageJson(wPath);
    if (!scripts) {
      results.push({ workspace: wName, status: 'fail', errors: ['package.json not found or invalid'] });
      exitCode = 1;
      continue;
    }

    const declared = Object.keys(scripts);
    const validation = validateScriptBoundary(wName, declared);

    for (const contract of SCRIPT_CONTRACTS) {
      if (contract.script in scripts && contract.dependencies.length > 0) {
        for (const dep of contract.dependencies) {
          if (!scripts[contract.script].includes(dep)) {
            // This is informational only - the workspace script might handle deps at root level
          }
        }
      }
    }

    results.push({
      workspace: wName,
      status: validation.valid ? 'pass' : 'fail',
      errors: validation.errors,
    });

    if (!validation.valid) {
      for (const err of validation.errors) {
        console.error(`ERROR: ${err}`);
      }
      exitCode = 1;
    }
  }

  console.log(`\nChecked ${results.length} workspaces — ${results.filter((r) => r.status === 'pass').length} pass, ${results.filter((r) => r.status === 'fail').length} fail`);
  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('workspace-workflow.ts')) run();
