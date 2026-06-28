import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface HardeningIssue {
  workspace: string;
  severity: 'error' | 'warn';
  message: string;
}

function checkTsconfigStrictness(path: string, workspaceName: string): HardeningIssue[] {
  const issues: HardeningIssue[] = [];
  if (!existsSync(path)) {
    issues.push({ workspace: workspaceName, severity: 'error', message: 'tsconfig.json not found' });
    return issues;
  }

  try {
    const config = JSON.parse(readFileSync(path, 'utf-8'));
    const compilerOptions = config.compilerOptions || {};

    const strictChecks = [
      { key: 'strict', label: 'strict mode' },
      { key: 'noUnusedLocals', label: 'noUnusedLocals' },
      { key: 'noUnusedParameters', label: 'noUnusedParameters' },
      { key: 'strictNullChecks', label: 'strictNullChecks' },
    ];

    for (const check of strictChecks) {
      if (compilerOptions[check.key] !== true) {
        issues.push({
          workspace: workspaceName,
          severity: 'warn',
          message: `tsconfig missing "${check.label}" (expected true)`,
        });
      }
    }
  } catch {
    issues.push({ workspace: workspaceName, severity: 'error', message: 'tsconfig.json is not valid JSON' });
  }

  return issues;
}

function checkEslintConfig(path: string, workspaceName: string): HardeningIssue[] {
  const issues: HardeningIssue[] = [];
  if (!existsSync(path)) return issues;

  try {
    const content = readFileSync(path, 'utf-8');
    const criticalRules = ['@typescript-eslint/no-unused-vars', 'no-console'];
    for (const rule of criticalRules) {
      if (!content.includes(rule)) {
        issues.push({
          workspace: workspaceName,
          severity: 'warn',
          message: `ESLint config missing rule "${rule}"`,
        });
      }
    }
  } catch {
    issues.push({ workspace: workspaceName, severity: 'error', message: 'ESLint config could not be read' });
  }

  return issues;
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  const workspaceDirs: [string, string][] = [
    ...['api', 'web', 'mobile'].map((d) => [resolve(root, 'apps', d), `@qyou/${d}`] as [string, string]),
    ...['shared', 'stellar'].map((d) => [resolve(root, 'packages', d), `@qyou/${d}`] as [string, string]),
  ];

  for (const [wPath, wName] of workspaceDirs) {
    const tsIssues = checkTsconfigStrictness(resolve(wPath, 'tsconfig.json'), wName);
    const eslintCandidates = ['eslint.config.mjs', '.eslintrc.js', '.eslintrc.json', '.eslintrc'];
    for (const candidate of eslintCandidates) {
      const eslintPath = resolve(wPath, candidate);
      if (existsSync(eslintPath)) {
        const eslintIssues = checkEslintConfig(eslintPath, wName);
        tsIssues.push(...eslintIssues);
        break;
      }
    }

    for (const issue of tsIssues) {
      const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
      console.error(`[${prefix}] ${issue.workspace} — ${issue.message}`);
      if (issue.severity === 'error') exitCode = 1;
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('lint-typecheck-hardening-phase3.ts')) main();
