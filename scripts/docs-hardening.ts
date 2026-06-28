import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { DOC_CONTRACTS, getDocContract, validateDocContents } from './docs-contract.js';

interface HardenIssue {
  workspace: string;
  type: 'error' | 'warn';
  message: string;
}

function checkDocsStructure(root: string): HardenIssue[] {
  const issues: HardenIssue[] = [];

  for (const contract of DOC_CONTRACTS) {
    const docsDir = resolve(root, contract.docsDir);

    if (!existsSync(docsDir)) {
      issues.push({ workspace: contract.workspace, type: 'error', message: `docs/ directory not found at ${contract.docsDir}` });
      continue;
    }

    try {
      const files = readdirSync(docsDir);

      // Check for orphaned files (files that exist but aren't in the contract)
      const contractFiles = new Set(contract.requirements.map((r) => r.file));
      for (const file of files) {
        if (!file.startsWith('.') && !contractFiles.has(file)) {
          issues.push({ workspace: contract.workspace, type: 'warn', message: `Unrecognized doc file: ${file}` });
        }
      }

      for (const req of contract.requirements) {
        if (!files.includes(req.file)) {
          if (req.required) {
            issues.push({ workspace: contract.workspace, type: 'error', message: `Required doc "${req.file}" is missing` });
          }
          continue;
        }

        const content = readFileSync(resolve(docsDir, req.file), 'utf-8');
        const validation = validateDocContents(content, req);
        for (const err of validation.errors) {
          issues.push({ workspace: contract.workspace, type: req.required ? 'error' : 'warn', message: err });
        }
      }
    } catch (e) {
      issues.push({ workspace: contract.workspace, type: 'error', message: `Error reading docs/: ${e}` });
    }
  }

  return issues;
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  const issues = checkDocsStructure(root);
  let exitCode = 0;

  for (const issue of issues) {
    const prefix = issue.type === 'error' ? 'ERROR' : 'WARN';
    console.error(`[${prefix}] ${issue.workspace} — ${issue.message}`);
    if (issue.type === 'error') exitCode = 1;
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('docs-hardening.ts')) main();
