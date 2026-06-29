import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface HardeningPhase5Issue {
  workspace: string;
  severity: 'error' | 'warn';
  message: string;
}

function checkPhase5Hardening(wPath: string, wName: string): HardeningPhase5Issue[] {
  const issues: HardeningPhase5Issue[] = [];

  const pkgPath = resolve(wPath, 'package.json');
  if (!existsSync(pkgPath)) {
    issues.push({ workspace: wName, severity: 'error', message: 'package.json not found' });
    return issues;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    issues.push({ workspace: wName, severity: 'error', message: 'package.json is invalid JSON' });
    return issues;
  }

  const scripts: Record<string, string> = (pkg.scripts as Record<string, string>) || {};

  for (const [scriptName, command] of Object.entries(scripts)) {
    if (!command || command.trim() === '') {
      issues.push({ workspace: wName, severity: 'error', message: `Script "${scriptName}" has empty command` });
    }

    if (command && command.trim().startsWith('echo')) {
      issues.push({ workspace: wName, severity: 'warn', message: `Script "${scriptName}" appears to be a placeholder (starts with echo)` });
    }

    if (scriptName === 'test' && command) {
      if (!command.includes('--test') && !command.includes('jest') && !command.includes('vitest') && !command.includes('mocha')) {
        issues.push({ workspace: wName, severity: 'warn', message: `Test script "${scriptName}" uses unknown test runner: "${command}"` });
      }
    }
  }

  const tsconfigPath = resolve(wPath, 'tsconfig.json');
  if (existsSync(tsconfigPath)) {
    try {
      const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
      const compilerOptions = tsconfig.compilerOptions || {};
      if (compilerOptions.strict !== true) {
        issues.push({ workspace: wName, severity: 'warn', message: 'tsconfig.json does not enable strict mode' });
      }
      if (compilerOptions.skipLibCheck === true) {
        issues.push({ workspace: wName, severity: 'warn', message: 'tsconfig.json has skipLibCheck enabled, may hide type errors' });
      }
    } catch {
      issues.push({ workspace: wName, severity: 'error', message: 'tsconfig.json is not valid JSON' });
    }
  } else {
    issues.push({ workspace: wName, severity: 'warn', message: 'No tsconfig.json found' });
  }

  const eslintCandidates = ['eslint.config.mjs', '.eslintrc.js', '.eslintrc.json', '.eslintrc'];
  const hasEslint = eslintCandidates.some((f) => existsSync(resolve(wPath, f)));
  if (!hasEslint) {
    issues.push({ workspace: wName, severity: 'warn', message: 'No ESLint config found' });
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
    const issues = checkPhase5Hardening(wPath, wName);
    for (const issue of issues) {
      const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
      console.error(`[${prefix}] ${issue.workspace} — ${issue.message}`);
      if (issue.severity === 'error') exitCode = 1;
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('workspace-hardening-phase5.ts')) main();
