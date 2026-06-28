import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface CiWorkflowResult {
  workflow: string;
  status: 'pass' | 'fail';
  errors: string[];
}

const REQUIRED_KEYS = ['name:', 'on:', 'jobs:', 'runs-on:', 'steps:'];
const REQUIRED_STEPS: Record<string, string[]> = {
  'backend.yml': ['Install dependencies', 'Lint', 'Test', 'Build'],
  'web.yml': ['Install dependencies', 'Lint', 'Test', 'Build'],
  'mobile.yml': ['Install dependencies', 'Lint', 'Test'],
  'packages.yml': ['Install dependencies', 'Build', 'Lint'],
};

function validateWorkflow(path: string, name: string): CiWorkflowResult {
  const errors: string[] = [];

  if (!existsSync(path)) {
    errors.push('Workflow file not found');
    return { workflow: name, status: 'fail', errors };
  }

  const content = readFileSync(path, 'utf-8');

  for (const key of REQUIRED_KEYS) {
    if (!content.includes(key)) {
      errors.push(`Missing key: "${key}"`);
    }
  }

  const expectedSteps = REQUIRED_STEPS[name] || [];
  for (const step of expectedSteps) {
    if (!content.includes(`name: ${step}`)) {
      errors.push(`Missing step: "${step}"`);
    }
  }

  // Verify install precedes lint
  const installIdx = content.indexOf('name: Install dependencies');
  const lintIdx = content.indexOf('name: Lint');
  if (installIdx !== -1 && lintIdx !== -1 && installIdx > lintIdx) {
    errors.push('Install step must precede Lint step');
  }

  const status = errors.length === 0 ? 'pass' : 'fail';
  return { workflow: name, status, errors };
}

function run(): void {
  const workflowsDir = resolve(import.meta.dirname, '..', '.github', 'workflows');
  let exitCode = 0;

  const workflowFiles = ['backend.yml', 'web.yml', 'mobile.yml', 'packages.yml'];

  for (const file of workflowFiles) {
    const path = resolve(workflowsDir, file);
    const result = validateWorkflow(path, file);
    console.log(`[${result.status.toUpperCase()}] ${file}`);
    for (const err of result.errors) {
      console.error(`  ERROR: ${err}`);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('ci-pipeline-workflow-phase3.ts')) run();
