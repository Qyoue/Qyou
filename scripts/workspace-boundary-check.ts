import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { SCRIPT_CONTRACTS } from './workspace-boundary-contract.js';

interface CheckIssue {
  workspace: string;
  severity: 'error' | 'warning';
  message: string;
}

function checkWorkspace(dir: string, name: string): CheckIssue[] {
  const issues: CheckIssue[] = [];
  const pkgPath = resolve(dir, 'package.json');

  if (!existsSync(pkgPath)) {
    issues.push({ workspace: name, severity: 'error', message: 'package.json not found' });
    return issues;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    issues.push({ workspace: name, severity: 'error', message: 'package.json is not valid JSON' });
    return issues;
  }

  const scripts: Record<string, string> = (pkg.scripts as Record<string, string>) || {};

  for (const contract of SCRIPT_CONTRACTS) {
    if (!contract.workspaces.includes(name)) continue;
    if (!(contract.script in scripts) && contract.required) {
      issues.push({ workspace: name, severity: 'error', message: `"${contract.script}" script is required but not declared` });
    }
    if (contract.script in scripts && !scripts[contract.script].trim()) {
      issues.push({ workspace: name, severity: 'error', message: `"${contract.script}" script is empty` });
    }
    if (contract.dependencies.length > 0 && contract.script in scripts) {
      const run = scripts[contract.script];
      for (const dep of contract.dependencies) {
        const depPkgPath = resolve(dir, '..', '..', dep.replace('@qyou/', '').replace('.', '/'), 'package.json');
        if (existsSync(depPkgPath)) {
          const depPkg = JSON.parse(readFileSync(depPkgPath, 'utf-8'));
          const depScript = depPkg.scripts?.[contract.script];
          if (depScript && run.includes('--workspaces') && !run.includes(`-w ${dep}`)) {
            if (!run.includes('--workspaces') && !run.includes(dep)) {
              issues.push({ workspace: name, severity: 'warning', message: `"${contract.script}" may need to include workspace ${dep}` });
            }
          }
        }
      }
    }
  }

  return issues;
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  const workspaceDirs: [string, string][] = [
    ...['api', 'web', 'mobile'].map((d) => [resolve(root, 'apps', d), `@qyou/${d}`] as [string, string]),
    ...['shared', 'stellar'].map((d) => [resolve(root, 'packages', d), `@qyou/${d}`] as [string, string]),
  ];

  for (const [wPath, wName] of workspaceDirs) {
    const issues = checkWorkspace(wPath, wName);
    for (const issue of issues) {
      if (issue.severity === 'error') {
        console.error(`ERROR: ${issue.workspace} — ${issue.message}`);
        exitCode = 1;
      } else {
        console.warn(`WARN: ${issue.workspace} — ${issue.message}`);
      }
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('workspace-boundary-check.ts')) main();
