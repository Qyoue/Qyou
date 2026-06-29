import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { CI_PIPELINE_PHASE4_CONTRACTS } from './ci-pipeline-contract-phase4.js';

interface CiHardeningIssue {
  workflow: string;
  severity: 'error' | 'warn';
  message: string;
}

function checkWorkflowHardening(root: string): CiHardeningIssue[] {
  const issues: CiHardeningIssue[] = [];
  const workflowsDir = resolve(root, '.github', 'workflows');

  if (!existsSync(workflowsDir)) {
    issues.push({ workflow: 'root', severity: 'error', message: 'Workflows directory not found' });
    return issues;
  }

  for (const contract of CI_PIPELINE_PHASE4_CONTRACTS) {
    const workflowPath = resolve(workflowsDir, contract.workflowFile);
    if (!existsSync(workflowPath)) {
      issues.push({ workflow: contract.workflowFile, severity: 'error', message: 'Workflow file not found' });
      continue;
    }

    const content = readFileSync(workflowPath, 'utf-8');

    if (!content.includes('actions/checkout@v4')) {
      issues.push({ workflow: contract.workflowFile, severity: 'warn', message: 'Not using actions/checkout@v4 (pinned action recommended)' });
    }

    if (!content.includes('actions/setup-node@v4')) {
      issues.push({ workflow: contract.workflowFile, severity: 'warn', message: 'Not using actions/setup-node@v4 (pinned action recommended)' });
    }

    if (!content.includes('npm ci')) {
      issues.push({ workflow: contract.workflowFile, severity: 'warn', message: 'Not using npm ci (deterministic install recommended)' });
    }

    if (!content.includes('timeout-minutes:')) {
      issues.push({ workflow: contract.workflowFile, severity: 'warn', message: 'No timeout-minutes configured on jobs' });
    }

    if (content.includes('npm install') && !content.includes('npm ci')) {
      issues.push({ workflow: contract.workflowFile, severity: 'warn', message: 'Uses npm install instead of npm ci for CI' });
    }

    if (!content.includes('hashFiles')) {
      issues.push({ workflow: contract.workflowFile, severity: 'warn', message: 'No hashFiles-based cache key found' });
    }

    const nodeVersionMatch = content.match(/node-version:\s*['"]?(\d+\.x)['"]?/);
    if (nodeVersionMatch && nodeVersionMatch[1] !== '20') {
      issues.push({ workflow: contract.workflowFile, severity: 'warn', message: `Uses Node ${nodeVersionMatch[1]} instead of 20.x` });
    }
  }

  return issues;
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  const issues = checkWorkflowHardening(root);
  let exitCode = 0;

  for (const issue of issues) {
    const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
    console.error(`[${prefix}] ${issue.workflow} — ${issue.message}`);
    if (issue.severity === 'error') exitCode = 1;
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('ci-pipeline-hardening-phase4.ts')) main();
