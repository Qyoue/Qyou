import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { PHASE4_LINT_CONTRACTS } from './lint-typecheck-contract-phase4.js';

interface WorkflowResult {
  workspace: string;
  status: 'pass' | 'fail';
  errors: string[];
}

function checkLintTypecheckConfig(root: string, contract: typeof PHASE4_LINT_CONTRACTS[0]): WorkflowResult {
  const errors: string[] = [];

  const shortName = contract.workspace.replace('@qyou/', '');
  const workspaceDir = resolve(root, shortName.startsWith('api') || shortName.startsWith('web') || shortName.startsWith('mobile') ? 'apps' : 'packages', shortName);

  if (!existsSync(workspaceDir)) {
    errors.push(`Workspace directory not found: ${workspaceDir}`);
    return { workspace: contract.workspace, status: 'fail', errors };
  }

  const tsconfigPath = resolve(workspaceDir, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    errors.push('tsconfig.json not found');
  }

  const eslintCandidates = ['eslint.config.mjs', '.eslintrc.js', '.eslintrc.json', '.eslintrc'];
  const hasEslint = eslintCandidates.some((f) => existsSync(resolve(workspaceDir, f)));
  if (!hasEslint) {
    errors.push('No ESLint config found');
  }

  const pkgPath = resolve(workspaceDir, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const scripts: Record<string, string> = pkg.scripts || {};

    if (!scripts.lint) errors.push('No "lint" script in package.json');
    if (!scripts.typecheck) errors.push('No "typecheck" script in package.json');
  } else {
    errors.push('package.json not found');
  }

  return { workspace: contract.workspace, status: errors.length === 0 ? 'pass' : 'fail', errors };
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  for (const contract of PHASE4_LINT_CONTRACTS) {
    const result = checkLintTypecheckConfig(root, contract);
    if (result.status === 'fail') {
      for (const err of result.errors) {
        console.error(`ERROR: ${result.workspace} — ${err}`);
      }
      exitCode = 1;
    } else {
      console.log(`PASS: ${result.workspace}`);
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('lint-typecheck-workflow-phase4.ts')) run();
