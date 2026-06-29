import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { CI_PIPELINE_PHASE4_CONTRACTS, getCiPipelinePhase4Contract } from './ci-pipeline-contract-phase4.js';

interface WorkflowCheckResult {
  workflow: string;
  status: 'pass' | 'fail';
  errors: string[];
}

function checkCiWorkflow(root: string): WorkflowCheckResult[] {
  const results: WorkflowCheckResult[] = [];
  const workflowsDir = resolve(root, '.github', 'workflows');

  if (!existsSync(workflowsDir)) {
    return [{ workflow: 'root', status: 'fail', errors: ['Workflows directory not found'] }];
  }

  for (const contract of CI_PIPELINE_PHASE4_CONTRACTS) {
    const errors: string[] = [];
    const workflowPath = resolve(workflowsDir, contract.workflowFile);

    if (!existsSync(workflowPath)) {
      errors.push(`Workflow file not found: ${contract.workflowFile}`);
      results.push({ workflow: contract.workflowFile, status: 'fail', errors });
      continue;
    }

    const content = readFileSync(workflowPath, 'utf-8');

    for (const job of contract.jobs) {
      for (const step of job.steps) {
        if (!content.includes(step)) {
          errors.push(`Job "${job.name}": missing step "${step}"`);
        }
      }
      if (job.required && !content.includes(`${job.name}:`)) {
        errors.push(`Required job "${job.name}" not found in workflow`);
      }
    }

    if (!content.includes('package-lock.json') && contract.lockFileRequired) {
      errors.push('Workflow does not reference package-lock.json for caching');
    }

    results.push({ workflow: contract.workflowFile, status: errors.length === 0 ? 'pass' : 'fail', errors });
  }

  return results;
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  const results = checkCiWorkflow(root);
  let exitCode = 0;

  for (const r of results) {
    console.log(`[${r.status.toUpperCase()}] ${r.workflow}`);
    for (const e of r.errors) {
      console.error(`  ERROR: ${e}`);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('ci-pipeline-workflow-phase4.ts')) run();
