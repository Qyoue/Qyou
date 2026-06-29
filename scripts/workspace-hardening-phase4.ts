import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface HardeningIssue {
  workspace: string;
  severity: 'error' | 'warn';
  message: string;
}

function checkScriptHardening(root: string, wPath: string, wName: string): HardeningIssue[] {
  const issues: HardeningIssue[] = [];

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
      continue;
    }

    if (command.includes(' -w ') || command.includes('--workspace')) {
      const workspaceRefs = command.match(/-w\s+(@\S+)/g);
      if (workspaceRefs) {
        for (const ref of workspaceRefs) {
          const ws = ref.replace('-w ', '').trim();
          if (wName === 'root' && !ws.startsWith('@qyou/')) {
            issues.push({ workspace: wName, severity: 'warn', message: `Script "${scriptName}" references unknown workspace "${ws}"` });
          }
        }
      }
    }

    if (command.includes('&&') && !command.startsWith('set -e')) {
      issues.push({ workspace: wName, severity: 'warn', message: `Script "${scriptName}" uses "&&" without "set -e" prefix` });
    }

    if (scriptName === 'test' && command.includes('--watch')) {
      issues.push({ workspace: wName, severity: 'warn', message: `Test script "${scriptName}" includes --watch flag, may hang in CI` });
    }
  }

  if (wName !== 'root') {
    if (scripts.build && scripts.test && !scripts.lint) {
      issues.push({ workspace: wName, severity: 'warn', message: 'Has build and test but no lint script' });
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
    const issues = checkScriptHardening(root, wPath, wName);
    for (const issue of issues) {
      const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
      console.error(`[${prefix}] ${issue.workspace} — ${issue.message}`);
      if (issue.severity === 'error') exitCode = 1;
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('workspace-hardening-phase4.ts')) main();
