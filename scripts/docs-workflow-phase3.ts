import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { DOCS_PHASE3_CONTRACTS } from './docs-contract-phase3.js';

interface DocsValidationResult {
  workspace: string;
  status: 'pass' | 'fail';
  errors: string[];
  warnings: string[];
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function validateDocFile(docsDir: string, contract: typeof DOCS_PHASE3_CONTRACTS[0]['files'][0]): string[] {
  const errors: string[] = [];
  const filePath = resolve(docsDir, contract.filename);

  if (!existsSync(filePath)) {
    if (contract.required) errors.push(`Required doc "${contract.filename}" is missing`);
    return errors;
  }

  const content = readFileSync(filePath, 'utf-8');

  if (content.length < contract.minChars) {
    errors.push(`${contract.filename}: too short (${content.length} chars, min ${contract.minChars})`);
  }

  for (const section of contract.sections) {
    const sectionHeader = `# ${section.name}`;
    const sectionLower = section.name.toLowerCase();

    if (!content.toLowerCase().includes(sectionLower)) {
      errors.push(`${contract.filename}: missing section "${section.name}"`);
    }
  }

  return errors;
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  for (const contract of DOCS_PHASE3_CONTRACTS) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const docsDir = resolve(root, contract.docsDir);

    if (!existsSync(docsDir)) {
      errors.push('docs/ directory not found');
      console.error(`ERROR: ${contract.workspace} — docs/ directory not found`);
      exitCode = 1;
      continue;
    }

    // Check for orphaned files
    const existingFiles = readdirSync(docsDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
    const contractFiles = new Set(contract.files.map((f) => f.filename));
    const orphaned = existingFiles.filter((f) => !contractFiles.has(f));
    if (orphaned.length > contract.maxOrphanedFiles) {
      warnings.push(`Too many orphaned docs files (${orphaned.length}, max ${contract.maxOrphanedFiles}): ${orphaned.join(', ')}`);
    }

    for (const fileContract of contract.files) {
      const fileErrors = validateDocFile(docsDir, fileContract);
      errors.push(...fileErrors);
    }

    for (const err of errors) {
      console.error(`ERROR: ${contract.workspace} — ${err}`);
      exitCode = 1;
    }
    for (const warn of warnings) {
      console.warn(`WARN: ${contract.workspace} — ${warn}`);
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('docs-workflow-phase3.ts')) run();
