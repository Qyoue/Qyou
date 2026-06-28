import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { CI_PIPELINE_CONTRACTS, getPipelineContract } from './ci-pipeline-contract.js';

interface ValidationResult {
  workflow: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateWorkflow(path: string): ValidationResult {
  const result: ValidationResult = {
    workflow: path.split('/').pop() || '',
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!existsSync(path)) {
    result.errors.push('Workflow file not found');
    result.valid = false;
    return result;
  }

  const content = readFileSync(path, 'utf-8');
  const contract = getPipelineContract(result.workflow);

  if (!contract) {
    result.warnings.push('No contract defined for this workflow');
    return result;
  }

  const contractStepNames = new Set(contract.jobs.map((j) => j.name.toLowerCase()));
  const foundSteps = new Set<string>();

  // Parse workflow YAML-ish
  const lines = content.split('\n');
  let inSteps = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'steps:') {
      inSteps = true;
      continue;
    }
    if (inSteps && trimmed.startsWith('- name:')) {
      const stepName = trimmed.replace('- name:', '').trim().toLowerCase();
      foundSteps.add(stepName);
    }
    // Reset steps context when we see another top-level key
    if (inSteps && !trimmed.startsWith('-') && !trimmed.startsWith('  ') && trimmed.includes(':') && !trimmed.startsWith(' ')) {
      inSteps = false;
    }
  }

  for (const job of contract.jobs) {
    if (job.required) {
      const match = [...foundSteps].some((s) => s.includes(job.name));
      if (!match) {
        result.errors.push(`Required job/step "${job.name}" not found in ${result.workflow}`);
        result.valid = false;
      }
    }
  }

  for (const job of contract.jobs) {
    if (job.failureHandling === 'continue') {
      if (!content.includes('continue-on-error') && !content.includes('if: failure()')) {
        result.warnings.push(`Job "${job.name}" uses "continue" strategy but no continue-on-error or fallback found`);
      }
    }
  }

  return result;
}

function main(): void {
  const workflowsDir = resolve(import.meta.dirname, '..', '.github', 'workflows');
  let exitCode = 0;

  const workflowFiles = ['backend.yml', 'web.yml', 'mobile.yml', 'packages.yml'];

  for (const file of workflowFiles) {
    const path = resolve(workflowsDir, file);
    const result = validateWorkflow(path);
    for (const err of result.errors) {
      console.error(`ERROR: ${err}`);
      exitCode = 1;
    }
    for (const warn of result.warnings) {
      console.warn(`WARN: ${warn}`);
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('ci-pipeline-workflow.ts')) main();
