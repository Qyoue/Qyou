import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface HardenIssue {
  workspace: string;
  severity: 'error' | 'warn';
  message: string;
}

function checkScriptHardening(workspacePath: string, workspaceName: string): HardenIssue[] {
  const issues: HardenIssue[] = [];
  const pkgPath = resolve(workspacePath, 'package.json');

  if (!existsSync(pkgPath)) {
    issues.push({ workspace: workspaceName, severity: 'error', message: 'package.json not found' });
    return issues;
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    issues.push({ workspace: workspaceName, severity: 'error', message: 'package.json is invalid JSON' });
    return issues;
  }

  const scripts: Record<string, string> = (pkg.scripts as Record<string, string>) || {};

  for (const [name, cmd] of Object.entries(scripts)) {
    if (!cmd.trim()) {
      issues.push({ workspace: workspaceName, severity: 'error', message: `"${name}" script is empty` });
    }
    if (cmd.includes('|| true') || cmd.includes('|| exit 0')) {
      issues.push({ workspace: workspaceName, severity: 'warn', message: `"${name}" swallows errors with "${cmd.match(/\|\|.*$/)?.[0]}"` });
    }
  }

  const eslintCandidates = ['eslint.config.mjs', '.eslintrc.js', '.eslintrc.json', '.eslintrc'];
  const hasEslint = eslintCandidates.some((f) => existsSync(resolve(workspacePath, f)));
  if (!hasEslint) {
    issues.push({ workspace: workspaceName, severity: 'warn', message: 'No ESLint config found' });
  }

  if (!existsSync(resolve(workspacePath, 'tsconfig.json'))) {
    issues.push({ workspace: workspaceName, severity: 'warn', message: 'No tsconfig.json found' });
  }

  if ('test' in scripts && scripts.test && scripts.test.includes('--watch')) {
    issues.push({ workspace: workspaceName, severity: 'warn', message: '"test" script uses --watch, which hangs in CI' });
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
    const issues = checkScriptHardening(wPath, wName);
    for (const issue of issues) {
      const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
      console.error(`[${prefix}] ${issue.workspace} — ${issue.message}`);
      if (issue.severity === 'error') exitCode = 1;
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('lint-typecheck-harden-phase1.ts')) main();
