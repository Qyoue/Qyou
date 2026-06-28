import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface CiStabilityCheck {
  workflow: string;
  checks: { name: string; pass: boolean; detail: string }[];
}

const REQUIRED_STEPS_PER_WORKFLOW: Record<string, string[]> = {
  'backend.yml': ['Install dependencies', 'Lint', 'Test', 'Build'],
  'web.yml': ['Install dependencies', 'Lint', 'Test', 'Build'],
  'mobile.yml': ['Install dependencies', 'Lint', 'Test'],
  'packages.yml': ['Install dependencies', 'Build', 'Lint'],
};

function validateWorkflowSteps(path: string, workflowName: string): CiStabilityCheck {
  const checks: CiStabilityCheck['checks'] = [];

  if (!existsSync(path)) {
    checks.push({ name: 'workflow file exists', pass: false, detail: 'File not found' });
    return { workflow: workflowName, checks };
  }

  checks.push({ name: 'workflow file exists', pass: true, detail: path });

  const content = readFileSync(path, 'utf-8');

  // Check for required top-level keys
  checks.push({ name: 'has name', pass: content.includes('name:'), detail: '' });
  checks.push({ name: 'has trigger', pass: content.includes('on:'), detail: '' });
  checks.push({ name: 'has jobs', pass: content.includes('jobs:'), detail: '' });
  checks.push({ name: 'has runs-on', pass: content.includes('runs-on:'), detail: '' });

  // Check each required step
  const expectedSteps = REQUIRED_STEPS_PER_WORKFLOW[workflowName] || [];
  for (const step of expectedSteps) {
    checks.push({
      name: `step "${step}" exists`,
      pass: content.includes(`name: ${step}`),
      detail: '',
    });
  }

  // Check for order (install must come first)
  const installIdx = content.indexOf('name: Install dependencies');
  const lintIdx = content.indexOf('name: Lint');
  if (installIdx !== -1 && lintIdx !== -1) {
    checks.push({
      name: 'install step precedes lint',
      pass: installIdx < lintIdx,
      detail: '',
    });
  }

  // Check npm ci vs npm install
  checks.push({
    name: 'uses npm ci (not npm install)',
    pass: content.includes('npm ci') && !content.includes('npm install'),
    detail: content.includes('npm install') ? 'npm install found instead of npm ci' : '',
  });

  return { workflow: workflowName, checks };
}

function main(): void {
  const workflowsDir = resolve(import.meta.dirname, '..', '.github', 'workflows');
  let totalFailures = 0;
  let totalChecks = 0;

  const workflows = ['backend.yml', 'web.yml', 'mobile.yml', 'packages.yml'];

  for (const wf of workflows) {
    const path = resolve(workflowsDir, wf);
    const result = validateWorkflowSteps(path, wf);
    for (const check of result.checks) {
      totalChecks++;
      if (!check.pass) {
        console.error(`FAIL: ${wf} — ${check.name}${check.detail ? ` (${check.detail})` : ''}`);
        totalFailures++;
      } else {
        console.log(`PASS: ${wf} — ${check.name}`);
      }
    }
  }

  console.log(`\n${totalChecks} checks, ${totalFailures} failures`);
  process.exit(totalFailures > 0 ? 1 : 0);
}

if (process.argv[1]?.endsWith('ci-pipeline-stability.test.ts')) main();
