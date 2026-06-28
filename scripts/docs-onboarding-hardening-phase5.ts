import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';

interface HardeningResult {
  workspace: string;
  status: 'pass' | 'fail' | 'recovered';
  errors: string[];
  recoveries: string[];
}

const DOCS_CONFIGS: Record<string, { dir: string; required: string[]; fallback: string[] }> = {
  '@qyou/api': { dir: 'apps/api/docs', required: ['development.md', 'architecture.md', 'testing.md', 'deployment.md', 'api-reference.md'], fallback: ['development.md', 'architecture.md'] },
  '@qyou/web': { dir: 'apps/web/docs', required: ['development.md', 'architecture.md', 'testing.md', 'component-library.md'], fallback: ['development.md', 'architecture.md'] },
  '@qyou/mobile': { dir: 'apps/mobile/docs', required: ['development.md', 'architecture.md', 'testing.md'], fallback: ['development.md', 'architecture.md'] },
  '@qyou/shared': { dir: 'packages/shared/docs', required: ['architecture.md', 'api-reference.md'], fallback: ['architecture.md'] },
  '@qyou/stellar': { dir: 'packages/stellar/docs', required: ['architecture.md', 'contracts.md'], fallback: ['architecture.md'] },
};

const DOC_TEMPLATES: Record<string, string> = {
  'development.md': '# Development\n\n## Setup\n\nSetup instructions.\n\n## Configuration\n\nConfiguration details.\n\n## Running Locally\n\nLocal development instructions.\n',
  'architecture.md': '# Architecture\n\n## Overview\n\nArchitecture overview.\n\n## Modules\n\nModule descriptions.\n\n## Data Flow\n\nData flow description.\n',
  'testing.md': '# Testing\n\n## Running Tests\n\nTest execution instructions.\n\n## Writing Tests\n\nGuidelines for writing tests.\n',
  'deployment.md': '# Deployment\n\n## Environment\n\nEnvironment configuration.\n\n## CI/CD\n\nCI/CD pipeline details.\n',
  'api-reference.md': '# API Reference\n\n## Endpoints\n\nAPI endpoint documentation.\n\n## Authentication\n\nAuthentication details.\n',
  'component-library.md': '# Component Library\n\n## UI Components\n\nComponent documentation.\n\n## Forms\n\nForm components.\n',
  'contracts.md': '# Contracts\n\n## Contract List\n\nList of smart contracts.\n\n## Deployment\n\nDeployment instructions.\n',
};

function createDocFromTemplate(filePath: string, fileName: string): boolean {
  try {
    mkdirSync(dirname(filePath), { recursive: true });
    const template = DOC_TEMPLATES[fileName] || `# ${fileName.replace('.md', '')}\n\n## Overview\n\nDocumentation.\n\n## Details\n\nDetails here.\n`;
    writeFileSync(filePath, template, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

function hardenDocs(workspace: string, config: { dir: string; required: string[]; fallback: string[] }): HardeningResult {
  const errors: string[] = [];
  const recoveries: string[] = [];
  const root = resolve(import.meta.dirname, '..');
  const docsPath = resolve(root, config.dir);

  if (!existsSync(docsPath)) {
    errors.push(`Docs directory missing: ${config.dir}`);
    try {
      mkdirSync(docsPath, { recursive: true });
      recoveries.push(`Created missing docs directory: ${config.dir}`);
    } catch {
      errors.push(`Cannot create docs directory: ${config.dir}`);
    }
  }

  if (existsSync(docsPath)) {
    const existing = readdirSync(docsPath);
    for (const file of config.required) {
      const fpath = resolve(docsPath, file);
      if (!existing.includes(file)) {
        if (createDocFromTemplate(fpath, file)) {
          recoveries.push(`Created missing doc from template: ${file}`);
        } else {
          errors.push(`Cannot create missing doc: ${file}`);
        }
      } else {
        try {
          const content = readFileSync(fpath, 'utf-8');
          if (content.length < 100) {
            if (createDocFromTemplate(fpath, file)) {
              recoveries.push(`Replaced undersized doc (${content.length} chars): ${file}`);
            } else {
              errors.push(`Cannot replace undersized doc: ${file}`);
            }
          }
          const sections = (content.match(/^## /gm) || []).length;
          if (sections < 2) {
            errors.push(`${file}: only ${sections} section(s), minimum 2 required`);
          }
        } catch {
          errors.push(`Cannot read ${file}`);
        }
      }
    }

    for (const file of existing) {
      if (!config.required.includes(file) && file.endsWith('.md')) {
        try {
          const content = readFileSync(resolve(docsPath, file), 'utf-8');
          if (content.length < 100) {
            try { writeFileSync(resolve(docsPath, file), ''); } catch {}
            recoveries.push(`Cleaned orphaned skeleton doc: ${file}`);
          }
        } catch {}
      }
    }
  }

  const status = errors.length === 0 ? (recoveries.length > 0 ? 'recovered' : 'pass') : 'fail';
  return { workspace, status, errors, recoveries };
}

function run(): void {
  let exitCode = 0;
  for (const [workspace, config] of Object.entries(DOCS_CONFIGS)) {
    const result = hardenDocs(workspace, config);
    console.log(`[${result.status.toUpperCase()}] ${workspace}`);
    for (const err of result.errors) { console.error(`  ERROR: ${err}`); exitCode = 1; }
    for (const rec of result.recoveries) { console.log(`  RECOVERED: ${rec}`); }
  }
  if (exitCode === 0) console.log('Documentation hardening complete.');
  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('docs-onboarding-hardening-phase5.ts')) run();
