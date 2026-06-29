import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PHASE5_CONTRACTS, getPhase5Contract } from './workspace-scripts-contract-phase5.js';

interface Phase5Result {
  workspace: string;
  status: 'pass' | 'fail';
  errors: string[];
}

function checkPhase5Scripts(): Phase5Result[] {
  const root = resolve(import.meta.dirname, '..');
  const results: Phase5Result[] = [];

  const workspaceDirs: [string, string][] = [
    ...['shared', 'stellar'].map((d) => [resolve(root, 'packages', d), `@qyou/${d}`] as [string, string]),
    ...['api', 'web', 'mobile'].map((d) => [resolve(root, 'apps', d), `@qyou/${d}`] as [string, string]),
  ];

  for (const [wPath, wName] of workspaceDirs) {
    const contract = getPhase5Contract(wName);
    if (!contract) {
      results.push({ workspace: wName, status: 'fail', errors: ['No Phase 5 contract defined'] });
      continue;
    }

    const errors: string[] = [];

    const pkgPath = resolve(wPath, 'package.json');
    if (!existsSync(pkgPath)) {
      errors.push('package.json not found');
      results.push({ workspace: wName, status: 'fail', errors });
      continue;
    }

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const scripts: Record<string, string> = pkg.scripts || {};

    const orderedContracts = [...PHASE5_CONTRACTS].sort((a, b) => a.buildOrder - b.buildOrder);

    for (const s of contract.scripts) {
      if (!(s.script in scripts)) {
        errors.push(`Required script "${s.script}" is missing`);
        continue;
      }

      for (const dep of s.dependsOn) {
        const depContract = getPhase5Contract(dep);
        if (depContract && depContract.buildOrder > contract.buildOrder) {
          errors.push(`Depends on "${dep}" which builds later (order ${depContract.buildOrder} > ${contract.buildOrder})`);
        }
      }

      for (const envVar of s.requiredEnvVars) {
        const envExample = resolve(root, wName === 'root' ? '.env.example' : `${wPath.replace(root + '/', '')}/.env.example`);
        if (existsSync(envExample)) {
          const envContent = readFileSync(envExample, 'utf-8');
          if (!envContent.includes(envVar)) {
            errors.push(`Required env var "${envVar}" not found in .env.example`);
          }
        }
      }
    }

    for (const forbidden of contract.boundary.forbiddenImports) {
      const tsconfigPath = resolve(wPath, 'tsconfig.json');
      if (existsSync(tsconfigPath)) {
        const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
        const paths = tsconfig.compilerOptions?.paths || {};
        for (const [alias, _targets] of Object.entries(paths)) {
          if (alias.replace('/*', '') === forbidden.replace('@qyou/', '')) {
            errors.push(`tsconfig paths contains forbidden import "${alias}" for ${wName}`);
          }
        }
      }
    }

    results.push({ workspace: wName, status: errors.length === 0 ? 'pass' : 'fail', errors });
  }

  return results;
}

function run(): void {
  const results = checkPhase5Scripts();
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

if (process.argv[1]?.endsWith('workspace-scripts-workflow-phase5.ts')) run();
