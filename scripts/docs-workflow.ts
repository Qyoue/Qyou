import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { DOC_CONTRACTS, getDocContract, validateDocContents } from './docs-contract.js';

interface DocWorkflowResult {
  workspace: string;
  errors: string[];
  warnings: string[];
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  for (const contract of DOC_CONTRACTS) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const docsDir = resolve(root, contract.docsDir);

    if (!existsSync(docsDir)) {
      errors.push(`docs/ directory not found at ${contract.docsDir}`);
      exitCode = 1;
      console.error(`ERROR: ${contract.workspace} — docs/ directory not found`);
      continue;
    }

    for (const req of contract.requirements) {
      const filePath = resolve(docsDir, req.file);
      if (!existsSync(filePath)) {
        if (req.required) {
          errors.push(`Required doc "${req.file}" is missing`);
          exitCode = 1;
        } else {
          warnings.push(`Optional doc "${req.file}" is missing`);
        }
        continue;
      }

      const content = readFileSync(filePath, 'utf-8');
      const validation = validateDocContents(content, req);
      if (!validation.valid) {
        for (const err of validation.errors) {
          errors.push(err);
          exitCode = 1;
        }
      }
    }

    for (const err of errors) console.error(`ERROR: ${contract.workspace} — ${err}`);
    for (const warn of warnings) console.warn(`WARN: ${contract.workspace} — ${warn}`);
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('docs-workflow.ts')) run();
