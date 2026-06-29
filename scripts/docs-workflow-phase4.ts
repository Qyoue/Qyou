import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { DOCS_ONBOARDING_PHASE4_CONTRACTS, getDocsOnboardingPhase4Contract } from './docs-onboarding-contract-phase4.js';

interface DocsWorkflowResult {
  workspace: string;
  status: 'pass' | 'fail';
  errors: string[];
}

function checkDocsStructure(root: string): DocsWorkflowResult[] {
  const results: DocsWorkflowResult[] = [];

  const workspaceMapping: [string, string][] = [
    ['apps/api', '@qyou/api'],
    ['apps/web', '@qyou/web'],
    ['apps/mobile', '@qyou/mobile'],
    ['packages/shared', '@qyou/shared'],
    ['packages/stellar', '@qyou/stellar'],
  ];

  for (const [wPath, wName] of workspaceMapping) {
    const contract = getDocsOnboardingPhase4Contract(wName);
    if (!contract) {
      results.push({ workspace: wName, status: 'fail', errors: ['No Phase 4 docs contract defined'] });
      continue;
    }

    const errors: string[] = [];
    const docsDir = resolve(root, wPath, 'docs');

    if (!existsSync(docsDir)) {
      results.push({ workspace: wName, status: 'fail', errors: [`Docs directory not found: ${docsDir}`] });
      continue;
    }

    for (const file of contract.files) {
      const filePath = resolve(docsDir, file.filename);
      if (!existsSync(filePath)) {
        if (file.required) {
          errors.push(`Required doc file missing: ${file.filename}`);
        }
      } else {
        const content = readFileSync(filePath, 'utf-8');
        if (content.length < file.minChars) {
          errors.push(`${file.filename}: content length ${content.length} < minimum ${file.minChars}`);
        }
      }
    }

    const rootDocs = ['docs/CONTRIBUTING.md', 'docs/SETUP.md', 'docs/TESTING.md'];
    for (const doc of rootDocs) {
      if (!existsSync(resolve(root, doc))) {
        errors.push(`Root doc missing: ${doc}`);
      }
    }

    results.push({ workspace: wName, status: errors.length === 0 ? 'pass' : 'fail', errors });
  }

  return results;
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  const results = checkDocsStructure(root);
  let exitCode = 0;

  for (const r of results) {
    console.log(`[${r.status.toUpperCase()}] ${r.workspace}`);
    for (const e of r.errors) {
      console.error(`  ERROR: ${e}`);
      exitCode = 1;
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('docs-workflow-phase4.ts')) run();
