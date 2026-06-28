import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface CiWorkflowResult {
  workflow: string;
  status: 'pass' | 'fail';
  errors: string[];
}

const WORKFLOW_FILES = ['backend.yml', 'web.yml', 'mobile.yml', 'packages.yml'];
const REQUIRED_KEYS = ['name:', 'on:', 'jobs:', 'runs-on:', 'steps:', 'timeout-minutes:'];
const STEP_ORDER: Record<string, string[]> = {
  'backend.yml': ['Install dependencies', 'Lint', 'Test', 'Build'],
  'web.yml': ['Install dependencies', 'Lint', 'Test', 'Build'],
  'mobile.yml': ['Install dependencies', 'Lint', 'Test', 'Build'],
  'packages.yml': ['Install dependencies', 'Build', 'Lint', 'Test'],
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

  for (const [i, step] of (STEP_ORDER[name] || []).entries()) {
    const idx = content.indexOf(`name: ${step}`);
    if (idx === -1) {
      errors.push(`Missing step: "${step}"`);
    } else if (i > 0) {
      const prevStep = STEP_ORDER[name]![i - 1];
      const prevIdx = content.indexOf(`name: ${prevStep}`);
      if (prevIdx !== -1 && idx < prevIdx) {
        errors.push(`Step order violation: "${step}" after "${prevStep}"`);
      }
    }
  }

  if (content.includes('npm install') && !content.includes('npm ci')) {
    errors.push('Use npm ci instead of npm install');
  }

  if (!content.includes('cache:') && !content.includes('cache-key')) {
    errors.push('No caching configured');
  }

  return { workflow: name, status: errors.length === 0 ? 'pass' : 'fail', errors };
}

function run(): void {
  const workflowsDir = resolve(import.meta.dirname, '..', '.github', 'workflows');
  let exitCode = 0;

  for (const file of WORKFLOW_FILES) {
    const path = resolve(workflowsDir, file);
    const result = validateWorkflow(path, file);
    console.log(`[${result.status.toUpperCase()}] ${file}`);
    for (const err of result.errors) {
      console.error(`  ERROR: ${err}`);
      exitCode = 1;
    }
  }

  if (exitCode === 0) {
    console.log('All CI pipeline workflows validated.');
  }
  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('ci-pipeline-workflow-phase5.ts')) run();
