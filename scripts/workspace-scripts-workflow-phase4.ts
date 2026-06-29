import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PHASE4_CONTRACTS, getPhase4Contract } from './workspace-scripts-contract-phase4.js';

interface Phase4Result {
  workspace: string;
  status: 'pass' | 'fail';
  errors: string[];
}

function checkWorkspaceScripts(): Phase4Result[] {
  const root = resolve(import.meta.dirname, '..');
  const results: Phase4Result[] = [];

  const workspaceDirs: [string, string][] = [
    ['root', 'root'],
    ...['shared', 'stellar'].map((d) => [resolve(root, 'packages', d), `@qyou/${d}`] as [string, string]),
    ...['api', 'web', 'mobile'].map((d) => [resolve(root, 'apps', d), `@qyou/${d}`] as [string, string]),
  ];

  for (const [wPath, wName] of workspaceDirs) {
    const contract = getPhase4Contract(wName);
    if (!contract) {
      results.push({ workspace: wName, status: 'fail', errors: ['No Phase 4 contract defined'] });
      continue;
    }

    const errors: string[] = [];

    if (wName === 'root') {
      const pkgPath = resolve(root, 'package.json');
      if (!existsSync(pkgPath)) {
        errors.push('Root package.json not found');
      } else {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const scripts: Record<string, string> = pkg.scripts || {};
        for (const s of contract.scripts) {
          if (s.required && scripts[s.name] === undefined) {
            errors.push(`Root script "${s.name}" (${s.description}) is missing from package.json`);
          }
        }
      }
    } else {
      const pkgPath = resolve(wPath, 'package.json');
      if (!existsSync(pkgPath)) {
        errors.push(`package.json not found for ${wName}`);
      } else {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        const scripts: Record<string, string> = pkg.scripts || {};
        for (const s of contract.scripts) {
          if (s.required && scripts[s.name] === undefined) {
            errors.push(`Required script "${s.name}" (${s.description}) is missing in ${wName}`);
          }
        }
      }

      if (existsSync(resolve(wPath, 'tsconfig.json'))) {
        const tsconfig = JSON.parse(readFileSync(resolve(wPath, 'tsconfig.json'), 'utf-8'));
        if (!tsconfig.compilerOptions) {
          errors.push(`${wName}: tsconfig.json missing compilerOptions`);
        }
      }
    }

    results.push({ workspace: wName, status: errors.length === 0 ? 'pass' : 'fail', errors });
  }

  return results;
}

function run(): void {
  const results = checkWorkspaceScripts();
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

if (process.argv[1]?.endsWith('workspace-scripts-workflow-phase4.ts')) run();
