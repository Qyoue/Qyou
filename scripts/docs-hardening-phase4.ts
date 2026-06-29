import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { DOCS_ONBOARDING_PHASE4_CONTRACTS } from './docs-onboarding-contract-phase4.js';

interface DocHardeningIssue {
  workspace: string;
  severity: 'error' | 'warn';
  message: string;
}

function checkSectionHeaders(content: string, filename: string, workspaceName: string): DocHardeningIssue[] {
  const issues: DocHardeningIssue[] = [];
  const sectionMatches = content.match(/^##\s+.+/gm);
  if (!sectionMatches || sectionMatches.length < 2) {
    issues.push({
      workspace: workspaceName,
      severity: 'warn',
      message: `${filename}: fewer than 2 section headers (##) found`,
    });
  }
  return issues;
}

function checkDeadLinks(content: string, filename: string, workspaceName: string): DocHardeningIssue[] {
  const issues: DocHardeningIssue[] = [];
  const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g);
  if (linkMatches) {
    for (const link of linkMatches) {
      const url = link.match(/\(([^)]+)\)/)?.[1] || '';
      if (url.startsWith('http') && !url.includes('example.com') && !url.includes('localhost')) {
        if (url.includes('TODO') || url.includes('placeholder')) {
          issues.push({
            workspace: workspaceName,
            severity: 'warn',
            message: `${filename}: placeholder URL found: ${url}`,
          });
        }
      }
    }
  }
  return issues;
}

function checkWorkspaceDocs(root: string, wPath: string, wName: string): DocHardeningIssue[] {
  const issues: DocHardeningIssue[] = [];
  const docsDir = resolve(root, wPath, 'docs');

  const contract = DOCS_ONBOARDING_PHASE4_CONTRACTS.find((c) => c.workspace === wName);
  if (!contract) return issues;

  const expectedFiles = contract.files.map((f) => f.filename);

  if (!existsSync(docsDir)) {
    issues.push({ workspace: wName, severity: 'error', message: 'Docs directory missing' });
    return issues;
  }

  for (const file of contract.files) {
    const filePath = resolve(docsDir, file.filename);
    if (!existsSync(filePath)) {
      if (file.required) {
        issues.push({ workspace: wName, severity: 'error', message: `Required file missing: ${file.filename}` });
      }
      continue;
    }

    const content = readFileSync(filePath, 'utf-8');

    if (content.length < file.minChars) {
      issues.push({
        workspace: wName,
        severity: 'warn',
        message: `${file.filename}: content too short (${content.length} chars, minimum ${file.minChars})`,
      });
    }

    issues.push(...checkSectionHeaders(content, file.filename, wName));
    issues.push(...checkDeadLinks(content, file.filename, wName));
  }

  try {
    const actual = readdirSync(docsDir).filter((f: string) => f.endsWith('.md'));
    for (const file of actual) {
      if (!expectedFiles.includes(file)) {
        issues.push({
          workspace: wName,
          severity: 'warn',
          message: `Orphaned doc file: ${file}`,
        });
      }
    }
  } catch {
    // ignore
  }

  return issues;
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  const workspaceDirs: [string, string][] = [
    ['apps/api', '@qyou/api'],
    ['apps/web', '@qyou/web'],
    ['apps/mobile', '@qyou/mobile'],
    ['packages/shared', '@qyou/shared'],
    ['packages/stellar', '@qyou/stellar'],
  ];

  for (const [wPath, wName] of workspaceDirs) {
    const issues = checkWorkspaceDocs(root, wPath, wName);
    for (const issue of issues) {
      const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
      console.error(`[${prefix}] ${issue.workspace} — ${issue.message}`);
      if (issue.severity === 'error') exitCode = 1;
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('docs-hardening-phase4.ts')) main();
