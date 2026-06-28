import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface HardeningResult {
  workflow: string;
  status: 'pass' | 'fail';
  errors: string[];
  recommendations: string[];
}

const WORKFLOW_FILES = ['backend.yml', 'web.yml', 'mobile.yml', 'packages.yml'];
const REQUIRED_SECTIONS = ['name:', 'on:', 'jobs:', 'runs-on:', 'steps:', 'timeout-minutes:'];
const PINNED_ACTIONS = ['actions/checkout@v4', 'actions/setup-node@v4'];

function hardenWorkflow(path: string, name: string): HardeningResult {
  const errors: string[] = [];
  const recommendations: string[] = [];

  if (!existsSync(path)) {
    errors.push('Workflow file not found');
    return { workflow: name, status: 'fail', errors, recommendations };
  }

  const content = readFileSync(path, 'utf-8');

  for (const section of REQUIRED_SECTIONS) {
    if (!content.includes(section)) {
      errors.push(`Missing section: ${section}`);
    }
  }

  for (const action of PINNED_ACTIONS) {
    if (!content.includes(action)) {
      if (content.includes(action.split('@')[0])) {
        recommendations.push(`Unpinned action detected, recommend using ${action}`);
      } else {
        recommendations.push(`Consider adding ${action}`);
      }
    }
  }

  if (content.includes('npm install') && !content.includes('npm ci')) {
    errors.push('npm install without npm ci breaks reproducibility');
  }

  if (!content.includes('cache:')) {
    recommendations.push('No caching configured - add dependency caching for faster runs');
  }

  if (content.includes('pull_request') && !content.includes('paths:')) {
    recommendations.push('Consider adding path filters to avoid running all jobs on every PR');
  }

  const runName = content.match(/name:\s*(.+)/);
  if (runName) {
    const nameStr = runName[1].trim();
    if (nameStr.length > 50) {
      recommendations.push(`Workflow name "${nameStr}" is very long (>50 chars)`);
    }
  }

  return { workflow: name, status: errors.length === 0 ? 'pass' : 'fail', errors, recommendations };
}

function run(): void {
  const workflowsDir = resolve(import.meta.dirname, '..', '.github', 'workflows');
  let exitCode = 0;

  for (const file of WORKFLOW_FILES) {
    const path = resolve(workflowsDir, file);
    const result = hardenWorkflow(path, file);
    console.log(`[${result.status.toUpperCase()}] ${file}`);
    for (const err of result.errors) { console.error(`  ERROR: ${err}`); exitCode = 1; }
    for (const rec of result.recommendations) { console.log(`  RECOMMEND: ${rec}`); }
  }

  if (exitCode === 0) console.log('CI pipeline hardening complete.');
  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('ci-pipeline-hardening-phase5.ts')) run();
