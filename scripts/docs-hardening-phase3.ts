import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

interface HardeningIssue {
  workspace: string;
  severity: 'error' | 'warn';
  message: string;
}

function checkDocFile(path: string, filename: string, workspaceName: string): HardeningIssue[] {
  const issues: HardeningIssue[] = [];

  if (!existsSync(path)) {
    issues.push({ workspace: workspaceName, severity: 'error', message: `Missing doc file: ${filename}` });
    return issues;
  }

  const content = readFileSync(path, 'utf-8');

  if (content.length < 200) {
    issues.push({ workspace: workspaceName, severity: 'warn', message: `${filename}: content length ${content.length} < 200 chars` });
  }

  const headers = content.match(/^##\s+.+/gm);
  if (!headers || headers.length < 1) {
    issues.push({ workspace: workspaceName, severity: 'warn', message: `${filename}: no section headers (##) found` });
  }

  const linkMatches = content.match(/\[([^\]]+)\]\(([^)]+)\)/g);
  if (linkMatches) {
    for (const link of linkMatches) {
      const url = link.match(/\(([^)]+)\)/)?.[1] || '';
      if (url.includes('TODO') || url.includes('placeholder')) {
        issues.push({ workspace: workspaceName, severity: 'warn', message: `${filename}: placeholder URL found: ${url}` });
      }
    }
  }

  return issues;
}

function checkWorkspaceDocs(root: string): HardeningIssue[] {
  const issues: HardeningIssue[] = [];

  const workspaceDirs: [string, string, string[]][] = [
    ['apps/api', '@qyou/api', ['development.md', 'architecture.md', 'testing.md']],
    ['apps/web', '@qyou/web', ['development.md', 'architecture.md', 'testing.md']],
    ['apps/mobile', '@qyou/mobile', ['development.md', 'architecture.md']],
    ['packages/shared', '@qyou/shared', ['architecture.md']],
    ['packages/stellar', '@qyou/stellar', ['architecture.md']],
  ];

  for (const [wPath, wName, expectedFiles] of workspaceDirs) {
    const docsDir = resolve(root, wPath, 'docs');

    if (!existsSync(docsDir)) {
      issues.push({ workspace: wName, severity: 'error', message: 'Docs directory missing' });
      continue;
    }

    for (const file of expectedFiles) {
      issues.push(...checkDocFile(resolve(docsDir, file), file, wName));
    }

    try {
      const actualFiles = readdirSync(docsDir).filter((f: string) => f.endsWith('.md'));
      const expected = new Set(expectedFiles);
      for (const f of actualFiles) {
        if (!expected.has(f)) {
          issues.push({ workspace: wName, severity: 'warn', message: `Unexpected doc file: ${f}` });
        }
      }
    } catch {
      // ignore
    }
  }

  const rootDocs = ['CONTRIBUTING.md', 'SETUP.md', 'TESTING.md'];
  for (const doc of rootDocs) {
    if (!existsSync(resolve(root, 'docs', doc))) {
      issues.push({ workspace: 'root', severity: 'error', message: `Missing root doc: ${doc}` });
    }
  }

  return issues;
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  const issues = checkWorkspaceDocs(root);
  let exitCode = 0;

  for (const issue of issues) {
    const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
    console.error(`[${prefix}] ${issue.workspace} — ${issue.message}`);
    if (issue.severity === 'error') exitCode = 1;
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('docs-hardening-phase3.ts')) main();
