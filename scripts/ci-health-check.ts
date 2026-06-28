import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

interface CiStep {
  name: string;
  uses?: string;
  run?: string;
  shell?: string;
  timeout?: string;
}

interface CiJob {
  name: string;
  runsOn: string;
  steps: CiStep[];
}

function parseWorkflow(path: string): CiJob[] {
  const content = readFileSync(path, 'utf-8');
  const jobs: CiJob[] = [];
  const lines = content.split('\n');
  let currentJob: CiJob | null = null;
  let inSteps = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('  ') && !trimmed.startsWith('    ') && trimmed.includes(':')) {
      const key = trimmed.split(':')[0].trim();
      if (['backend', 'web', 'mobile', 'packages'].includes(key)) {
        if (currentJob) jobs.push(currentJob);
        currentJob = { name: key, runsOn: '', steps: [] };
        inSteps = false;
      }
    }

    if (trimmed.startsWith('runs-on:')) {
      if (currentJob) currentJob.runsOn = trimmed.split(':')[1]?.trim() || '';
    }

    if (trimmed === 'steps:') {
      inSteps = true;
      continue;
    }

    if (inSteps && trimmed.startsWith('- name:')) {
      if (currentJob) {
        currentJob.steps.push({
          name: trimmed.replace('- name:', '').trim(),
        });
      }
    }

    if (inSteps && trimmed.startsWith('- uses:')) {
      if (currentJob && currentJob.steps.length > 0) {
        currentJob.steps[currentJob.steps.length - 1].uses =
          trimmed.replace('- uses:', '').trim();
      }
    }

    if (inSteps && trimmed.startsWith('run:')) {
      if (currentJob && currentJob.steps.length > 0) {
        currentJob.steps[currentJob.steps.length - 1].run =
          trimmed.replace('run:', '').trim();
      }
    }
  }

  if (currentJob) jobs.push(currentJob);
  return jobs;
}

function auditWorkflow(filePath: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const jobs = parseWorkflow(filePath);
  const name = filePath.split('/').pop() || '';

  if (jobs.length === 0) {
    errors.push(`${name}: no jobs found`);
    return { errors, warnings };
  }

  for (const job of jobs) {
    if (!job.runsOn) {
      errors.push(`${name}/${job.name}: missing runs-on`);
    }

    const stepNames = job.steps.map((s) => s.name.toLowerCase());
    const criticalSteps = ['lint', 'test', 'build'];

    for (const step of criticalSteps) {
      if (step === 'build' && name === 'mobile.yml') continue; // mobile has no build
      if (!stepNames.some((s) => s.includes(step))) {
        warnings.push(`${name}/${job.name}: missing "${step}" step`);
      }
    }

    if (job.steps.length === 0) {
      warnings.push(`${name}/${job.name}: no steps defined`);
    }
  }

  return { errors, warnings };
}

function main(): void {
  const workflowsDir = resolve(ROOT, '.github/workflows');
  let totalErrors = 0;
  let totalWarnings = 0;

  let files: string[];
  try {
    files = readdirSync(workflowsDir).filter((f) => f.endsWith('.yml'));
  } catch {
    console.error('FATAL: .github/workflows directory not found');
    process.exit(2);
  }

  for (const file of files) {
    const path = resolve(workflowsDir, file);
    const result = auditWorkflow(path);
    for (const err of result.errors) {
      console.error(`ERROR: ${err}`);
      totalErrors++;
    }
    for (const warn of result.warnings) {
      console.warn(`WARN: ${warn}`);
      totalWarnings++;
    }
  }

  console.log(`\n${totalErrors} error(s), ${totalWarnings} warning(s)`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
