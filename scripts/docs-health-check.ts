import { readdirSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

interface HealthResult {
  workspace: string;
  status: 'ok' | 'warn' | 'fail';
  issues: string[];
}

function checkDoc(dir: string, name: string): string | null {
  const path = resolve(dir, name);
  if (!existsSync(path)) return `${name}: missing`;
  const content = readFileSync(path, 'utf-8').trim();
  if (content.length === 0) return `${name}: empty file`;
  if (content.length < 50) return `${name}: too short (${content.length} chars, min 50)`;
  return null;
}

function healthCheckWorkspace(workspacePath: string, workspaceName: string): HealthResult {
  const issues: string[] = [];
  const docsDir = resolve(workspacePath, 'docs');

  if (!existsSync(docsDir)) {
    return { workspace: workspaceName, status: 'fail', issues: ['docs/ directory not found'] };
  }

  for (const doc of ['development.md', 'architecture.md', 'testing.md']) {
    const issue = checkDoc(docsDir, doc);
    if (issue) issues.push(issue);
  }

  const status = issues.length === 0 ? 'ok' : issues.some((i) => i.includes('missing')) ? 'fail' : 'warn';
  return { workspace: workspaceName, status, issues };
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  const workspaceDirs: [string, string][] = [];
  for (const dir of ['apps', 'packages']) {
    for (const d of readdirSync(resolve(root, dir))) {
      workspaceDirs.push([resolve(root, dir, d), `@qyou/${d}`]);
    }
  }

  for (const [wPath, wName] of workspaceDirs) {
    const result = healthCheckWorkspace(wPath, wName);
    if (result.status === 'fail') {
      console.error(`FAIL: ${wName}`);
      for (const i of result.issues) console.error(`  - ${i}`);
      exitCode = 1;
    } else if (result.status === 'warn') {
      console.warn(`WARN: ${wName}`);
      for (const i of result.issues) console.warn(`  - ${i}`);
    } else {
      console.log(`OK: ${wName}`);
    }
  }

  process.exit(exitCode);
}

main();
