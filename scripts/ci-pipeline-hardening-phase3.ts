import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface HardenCheck {
  workflow: string;
  severity: 'error' | 'warn';
  message: string;
}

function hardenCheck(path: string, name: string): HardenCheck[] {
  const checks: HardenCheck[] = [];

  if (!existsSync(path)) {
    checks.push({ workflow: name, severity: 'error', message: 'Workflow file not found' });
    return checks;
  }

  const content = readFileSync(path, 'utf-8');

  // Check for deprecated set-output
  if (content.includes('::set-output')) {
    checks.push({ workflow: name, severity: 'error', message: 'Deprecated ::set-output syntax detected' });
  }

  // Check for unpinned actions
  const actionUses = content.match(/uses:\s+\S+/g) || [];
  for (const use of actionUses) {
    const action = use.replace('uses:', '').trim();
    if (!action.includes('@') || action.includes('@main') || action.includes('@master') || action.includes('@latest')) {
      checks.push({ workflow: name, severity: 'warn', message: `Action "${action}" not pinned to a specific version` });
    }
  }

  // Check for timeout-minutes
  if (!content.includes('timeout-minutes:')) {
    checks.push({ workflow: name, severity: 'warn', message: 'No timeout-minutes set' });
  }

  // Check for explicit shell
  if (!content.includes('shell:')) {
    checks.push({ workflow: name, severity: 'warn', message: 'No explicit shell set' });
  }

  // Check npm install vs npm ci
  if (content.includes('npm install') && !content.includes('npm ci')) {
    checks.push({ workflow: name, severity: 'error', message: 'Uses npm install instead of npm ci' });
  }

  return checks;
}

function main(): void {
  const workflowsDir = resolve(import.meta.dirname, '..', '.github', 'workflows');
  let exitCode = 0;

  const workflowFiles = ['backend.yml', 'web.yml', 'mobile.yml', 'packages.yml'];

  for (const file of workflowFiles) {
    const path = resolve(workflowsDir, file);
    const checks = hardenCheck(path, file);
    for (const check of checks) {
      const prefix = check.severity === 'error' ? 'ERROR' : 'WARN';
      console.error(`[${prefix}] ${check.workflow} — ${check.message}`);
      if (check.severity === 'error') exitCode = 1;
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('ci-pipeline-hardening-phase3.ts')) main();
