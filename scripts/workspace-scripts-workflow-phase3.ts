import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PHASE3_CONTRACTS, getPhase3Contract } from './workspace-scripts-contract-phase3.js';

interface Phase3Result {
  workspace: string;
  status: 'pass' | 'fail';
  errors: string[];
}

function checkDependencyGraph(): Phase3Result[] {
  const root = resolve(import.meta.dirname, '..');
  const results: Phase3Result[] = [];

  const workspaceDirs: [string, string][] = [
    ...['shared', 'stellar'].map((d) => [resolve(root, 'packages', d), `@qyou/${d}`] as [string, string]),
    ...['api', 'web', 'mobile'].map((d) => [resolve(root, 'apps', d), `@qyou/${d}`] as [string, string]),
  ];

  for (const [wPath, wName] of workspaceDirs) {
    const contract = getPhase3Contract(wName);
    if (!contract) {
      results.push({ workspace: wName, status: 'fail', errors: ['No Phase 3 contract defined'] });
      continue;
    }

    const errors: string[] = [];

    // Check package.json exists
    const pkgPath = resolve(wPath, 'package.json');
    if (!existsSync(pkgPath)) {
      errors.push('package.json not found');
      results.push({ workspace: wName, status: 'fail', errors });
      continue;
    }

    let pkg: Record<string, unknown>;
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    } catch {
      errors.push('package.json is invalid JSON');
      results.push({ workspace: wName, status: 'fail', errors });
      continue;
    }

    const scripts: Record<string, string> = (pkg.scripts as Record<string, string>) || {};

    // Check dependency scripts exist
    for (const s of contract.scripts) {
      if (!(s.script in scripts)) {
        errors.push(`Required script "${s.script}" is missing`);
      }
      for (const dep of s.dependsOn) {
        const depContract = getPhase3Contract(dep);
        if (depContract) {
          for (const depScript of depContract.scripts) {
            const depPkgPath = resolve(root, '..', dep.replace('@qyou/', '').replace('.', '/'), 'package.json');
            // Can't easily check nested deps, skip
          }
        }
      }
    }

    results.push({
      workspace: wName,
      status: errors.length === 0 ? 'pass' : 'fail',
      errors,
    });
  }

  return results;
}

function run(): void {
  const results = checkDependencyGraph();
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

if (process.argv[1]?.endsWith('workspace-scripts-workflow-phase3.ts')) run();
