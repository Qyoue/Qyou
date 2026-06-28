import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface HardenResult {
  workflow: string;
  errors: string[];
  warnings: string[];
}

function hardenCheck(path: string, name: string): HardenResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!existsSync(path)) {
    errors.push('Workflow file not found');
    return { workflow: name, errors, warnings };
  }

  const content = readFileSync(path, 'utf-8');

  // Check for explicit shell
  if (!content.includes('shell: bash') && !content.includes('shell: sh')) {
    warnings.push('No explicit shell set — defaults may vary by runner');
  }

  // Check for timeout
  if (!content.includes('timeout-minutes:')) {
    warnings.push('No timeout-minutes set — workflow could run indefinitely');
  }

  // Check npm ci has a fallback note
  if (content.includes('npm ci') && !content.includes('npm cache') && !content.includes('cache: npm')) {
    warnings.push('npm ci without cache may be slow');
  }

  // Check that steps don't use deprecated set-output
  if (content.includes('::set-output')) {
    errors.push('Deprecated ::set-output syntax detected');
  }

  // Check for pinned action versions
  const actionUses = content.match(/uses:\s+\S+/g) || [];
  for (const use of actionUses) {
    const action = use.replace('uses:', '').trim();
    if (!action.includes('@') || action.includes('@main') || action.includes('@master')) {
      warnings.push(`Action "${action}" not pinned to a specific version`);
    }
  }

  return { workflow: name, errors, warnings };
}

function main(): void {
  const workflowsDir = resolve(import.meta.dirname, '..', '.github', 'workflows');
  let exitCode = 0;

  const workflowFiles = ['backend.yml', 'web.yml', 'mobile.yml', 'packages.yml'];

  for (const file of workflowFiles) {
    const path = resolve(workflowsDir, file);
    const result = hardenCheck(path, file);
    for (const err of result.errors) {
      console.error(`ERROR: ${file} — ${err}`);
      exitCode = 1;
    }
    for (const warn of result.warnings) {
      console.warn(`WARN: ${file} — ${warn}`);
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('ci-pipeline-hardening.ts')) main();
