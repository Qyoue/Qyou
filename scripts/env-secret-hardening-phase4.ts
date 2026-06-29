import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { ENV_SECRET_PHASE4_CONTRACTS } from './env-secret-contract-phase4.js';

interface EnvHardeningIssue {
  workspace: string;
  severity: 'error' | 'warn';
  message: string;
}

function checkEnvHardening(root: string): EnvHardeningIssue[] {
  const issues: EnvHardeningIssue[] = [];

  const gitignorePath = resolve(root, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, 'utf-8');
    const expectedPatterns = ['.env', '.env.local', '.env.*.local', '.env.encrypted'];
    for (const pattern of expectedPatterns) {
      if (!gitignore.includes(pattern)) {
        issues.push({ workspace: 'root', severity: 'warn', message: `.gitignore missing pattern "${pattern}"` });
      }
    }
  } else {
    issues.push({ workspace: 'root', severity: 'error', message: '.gitignore not found' });
  }

  for (const contract of ENV_SECRET_PHASE4_CONTRACTS) {
    const envExamplePath = resolve(root, contract.envExampleFile);
    if (!existsSync(envExamplePath)) {
      issues.push({ workspace: contract.workspace, severity: 'error', message: `.env.example missing at ${contract.envExampleFile}` });
      continue;
    }

    const content = readFileSync(envExamplePath, 'utf-8');

    for (const v of contract.vars) {
      if (v.secret) {
        const regex = new RegExp(`^${v.key}=`, 'm');
        if (!regex.test(content)) {
          issues.push({ workspace: contract.workspace, severity: 'warn', message: `Secret "${v.key}" not declared in .env.example` });
          continue;
        }

        const match = content.match(new RegExp(`^${v.key}=(.+)`, 'm'));
        if (match) {
          const placeholder = match[1].toLowerCase();
          if (placeholder === '' || placeholder.includes('your-') || placeholder.includes('changeme') || placeholder.includes('<') || placeholder.includes('[')) {
            issues.push({ workspace: contract.workspace, severity: 'warn', message: `Secret "${v.key}" uses placeholder value "${match[1]}"` });
          }
        }
      }
    }

    if (content.includes('#') === false) {
      issues.push({ workspace: contract.workspace, severity: 'warn', message: '.env.example has no comments explaining vars' });
    }

    if (contract.workspace === '@qyou/api') {
      if (!content.includes('PORT=')) issues.push({ workspace: contract.workspace, severity: 'warn', message: '.env.example should include PORT variable' });
    }
  }

  return issues;
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  const issues = checkEnvHardening(root);
  let exitCode = 0;

  for (const issue of issues) {
    const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
    console.error(`[${prefix}] ${issue.workspace} — ${issue.message}`);
    if (issue.severity === 'error') exitCode = 1;
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('env-secret-hardening-phase4.ts')) main();
