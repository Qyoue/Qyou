import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

interface DocsWorkflowResult {
  workspace: string;
  status: 'pass' | 'fail';
  errors: string[];
}

const DOCS_PATHS: Record<string, { dir: string; required: string[] }> = {
  '@qyou/api': { dir: 'apps/api/docs', required: ['development.md', 'architecture.md', 'testing.md', 'deployment.md', 'api-reference.md'] },
  '@qyou/web': { dir: 'apps/web/docs', required: ['development.md', 'architecture.md', 'testing.md', 'component-library.md'] },
  '@qyou/mobile': { dir: 'apps/mobile/docs', required: ['development.md', 'architecture.md', 'testing.md'] },
  '@qyou/shared': { dir: 'packages/shared/docs', required: ['architecture.md', 'api-reference.md'] },
  '@qyou/stellar': { dir: 'packages/stellar/docs', required: ['architecture.md', 'contracts.md'] },
};

function validateDocs(path: string, workspace: string, required: string[]): DocsWorkflowResult {
  const errors: string[] = [];

  if (!existsSync(path)) {
    errors.push(`Docs directory not found: ${path}`);
    return { workspace, status: 'fail', errors };
  }

  const files = readdirSync(path);
  for (const file of required) {
    if (!files.includes(file)) {
      errors.push(`Missing required doc: ${file}`);
    }
  }

  for (const file of required) {
    const fpath = resolve(path, file);
    if (existsSync(fpath)) {
      const content = readFileSync(fpath, 'utf-8');
      if (content.length < 200) {
        errors.push(`${file}: content too short (${content.length} chars, minimum 200)`);
      }
      const sectionCount = (content.match(/^## /gm) || []).length;
      if (sectionCount < 2) {
        errors.push(`${file}: too few sections (${sectionCount}, minimum 2)`);
      }
    }
  }

  return { workspace, status: errors.length === 0 ? 'pass' : 'fail', errors };
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  for (const [workspace, config] of Object.entries(DOCS_PATHS)) {
    const path = resolve(root, config.dir);
    const result = validateDocs(path, workspace, config.required);

    const readmePath = resolve(root, config.dir, '..', 'README.md');
    if (existsSync(readmePath)) {
      const readme = readFileSync(readmePath, 'utf-8');
      if (!readme.includes('Setup') && !readme.includes('Getting Started')) {
        result.errors.push('Workspace README missing Setup or Getting Started section');
      }
    }

    console.log(`[${result.status.toUpperCase()}] ${workspace}`);
    for (const err of result.errors) {
      console.error(`  ERROR: ${err}`);
      exitCode = 1;
    }
  }

  if (exitCode === 0) {
    console.log('All documentation contracts validated successfully.');
  }
  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('docs-onboarding-workflow-phase5.ts')) run();
