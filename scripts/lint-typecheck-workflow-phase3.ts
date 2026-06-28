import { existsSync } from 'fs';
import { resolve } from 'path';
import { PHASE3_CONTRACTS } from './lint-typecheck-contract-phase3.js';

interface WorkflowResult {
  workspace: string;
  status: 'pass' | 'fail';
  errors: string[];
}

function checkWorkspaceConfig(root: string, contract: typeof PHASE3_CONTRACTS[0]): WorkflowResult {
  const errors: string[] = [];

  const shortName = contract.workspace.replace('@qyou/', '');
  const workspaceDir = resolve(root, shortName.startsWith('api') || shortName.startsWith('web') || shortName.startsWith('mobile') ? 'apps' : 'packages', shortName);

  if (!existsSync(workspaceDir)) {
    errors.push(`Workspace directory not found: ${workspaceDir}`);
    return { workspace: contract.workspace, status: 'fail', errors };
  }

  // Check tsconfig.json exists
  const tsconfigPath = resolve(workspaceDir, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    errors.push('tsconfig.json not found');
  }

  // Check eslint config exists
  const eslintCandidates = ['eslint.config.mjs', '.eslintrc.js', '.eslintrc.json', '.eslintrc'];
  const hasEslint = eslintCandidates.some((f) => existsSync(resolve(workspaceDir, f)));
  if (!hasEslint) {
    errors.push('No ESLint config found');
  }

  // Check test framework config
  if (contract.testFramework === 'jest') {
    const jestCandidates = ['jest.config.js', 'jest.config.ts', 'jest.config.mjs', 'jest.config.json'];
    const hasJest = jestCandidates.some((f) => existsSync(resolve(workspaceDir, f)));
    if (!hasJest) {
      errors.push('No Jest config found for workspace expecting jest');
    }
  }

  return { workspace: contract.workspace, status: errors.length === 0 ? 'pass' : 'fail', errors };
}

function run(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  for (const contract of PHASE3_CONTRACTS) {
    const result = checkWorkspaceConfig(root, contract);
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

if (process.argv[1]?.endsWith('lint-typecheck-workflow-phase3.ts')) run();
