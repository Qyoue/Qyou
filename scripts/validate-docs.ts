import { readdirSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface DocValidation {
  workspace: string;
  hasDocsDir: boolean;
  present: string[];
  missing: string[];
  optionalPresent: string[];
  optionalMissing: string[];
}

const REQUIRED_DOCS = ['development.md', 'architecture.md', 'testing.md'];
const OPTIONAL_DOCS = ['deployment.md'];

export function validateDocsForWorkspace(workspacePath: string, workspaceName: string): DocValidation {
  const docsDir = resolve(workspacePath, 'docs');
  const hasDocsDir = existsSync(docsDir);

  if (!hasDocsDir) {
    return {
      workspace: workspaceName,
      hasDocsDir: false,
      present: [],
      missing: [...REQUIRED_DOCS],
      optionalPresent: [],
      optionalMissing: [...OPTIONAL_DOCS],
    };
  }

  try {
    const files = readdirSync(docsDir);
    const present = REQUIRED_DOCS.filter((d) => files.includes(d));
    const missing = REQUIRED_DOCS.filter((d) => !files.includes(d));
    const optionalPresent = OPTIONAL_DOCS.filter((d) => files.includes(d));
    const optionalMissing = OPTIONAL_DOCS.filter((d) => !files.includes(d));
    return { workspace: workspaceName, hasDocsDir: true, present, missing, optionalPresent, optionalMissing };
  } catch {
    return {
      workspace: workspaceName,
      hasDocsDir: true,
      present: [],
      missing: [...REQUIRED_DOCS],
      optionalPresent: [],
      optionalMissing: [...OPTIONAL_DOCS],
    };
  }
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  const appsDir = resolve(root, 'apps');
  const packagesDir = resolve(root, 'packages');
  let exitCode = 0;

  const workspaceDirs: [string, string][] = [
    ...readdirSync(appsDir).map((d) => [resolve(appsDir, d), `@qyou/${d}`] as [string, string]),
    ...readdirSync(packagesDir).map((d) => [resolve(packagesDir, d), `@qyou/${d}`] as [string, string]),
  ];

  for (const [wPath, wName] of workspaceDirs) {
    const result = validateDocsForWorkspace(wPath, wName);
    if (!result.hasDocsDir || result.missing.length > 0) {
      console.error(`ERROR: ${wName} is missing required docs:`);
      if (!result.hasDocsDir) {
        console.error(`  - docs/ directory not found`);
      }
      for (const m of result.missing) {
        console.error(`  - docs/${m} is missing`);
      }
      exitCode = 1;
    }
    for (const m of result.optionalMissing) {
      console.warn(`WARN: ${wName} is missing optional doc: docs/${m}`);
    }
  }

  process.exit(exitCode);
}

const isMainModule = process.argv[1] && (
  process.argv[1] === import.meta.filename ||
  process.argv[1].endsWith('validate-docs.ts')
);
if (isMainModule) main();
