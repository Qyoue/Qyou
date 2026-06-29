export interface ScriptCommand {
  name: string;
  command: string;
  description: string;
  required: boolean;
  workspace: string;
}

export interface WorkspaceScriptsPhase4Contract {
  workspace: string;
  scripts: ScriptCommand[];
  phase: number;
  documentation: {
    exists: boolean;
    path: string;
  };
  validation: {
    enforceAllDefined: boolean;
    checkCommandNonEmpty: boolean;
    verifyWorkspaceExists: boolean;
  };
}

const ROOT_SCRIPTS: ScriptCommand[] = [
  { name: 'build', command: 'npm run build --workspaces --if-present', description: 'Build all workspaces', required: true, workspace: 'root' },
  { name: 'dev', command: 'concurrently -n api,web,mobile "npm run dev -w @qyou/api" "npm run dev -w @qyou/web" "npm run dev -w @qyou/mobile"', description: 'Start all dev servers', required: true, workspace: 'root' },
  { name: 'lint', command: 'npm run lint --workspaces --if-present', description: 'Run ESLint across all workspaces', required: true, workspace: 'root' },
  { name: 'typecheck', command: 'npm run typecheck --workspaces --if-present', description: 'TypeScript type check all workspaces', required: true, workspace: 'root' },
  { name: 'test', command: 'npm run test --workspaces --if-present', description: 'Run tests across all workspaces', required: true, workspace: 'root' },
  { name: 'format', command: 'prettier --write .', description: 'Format all files with Prettier', required: false, workspace: 'root' },
  { name: 'format:check', command: 'prettier --check .', description: 'Check formatting without writing', required: false, workspace: 'root' },
];

const API_SCRIPTS: ScriptCommand[] = [
  { name: 'build', command: 'tsc -p tsconfig.json', description: 'Compile TypeScript', required: true, workspace: '@qyou/api' },
  { name: 'dev', command: 'tsx watch --clear-screen=false src/main.ts', description: 'Start dev server with hot reload', required: true, workspace: '@qyou/api' },
  { name: 'lint', command: 'eslint .', description: 'Run ESLint', required: true, workspace: '@qyou/api' },
  { name: 'typecheck', command: 'tsc -p tsconfig.json --noEmit', description: 'TypeScript type check', required: true, workspace: '@qyou/api' },
  { name: 'test', command: 'node --import tsx --test src/modules/auth/tests/*.test.ts', description: 'Run tests', required: true, workspace: '@qyou/api' },
];

const WEB_SCRIPTS: ScriptCommand[] = [
  { name: 'build', command: 'next build', description: 'Build Next.js app', required: true, workspace: '@qyou/web' },
  { name: 'dev', command: 'next dev', description: 'Start Next.js dev server', required: true, workspace: '@qyou/web' },
  { name: 'lint', command: 'eslint .', description: 'Run ESLint', required: true, workspace: '@qyou/web' },
  { name: 'typecheck', command: 'tsc --noEmit', description: 'TypeScript type check', required: true, workspace: '@qyou/web' },
  { name: 'test', command: 'jest', description: 'Run tests', required: true, workspace: '@qyou/web' },
];

const MOBILE_SCRIPTS: ScriptCommand[] = [
  { name: 'dev', command: 'expo start', description: 'Start Expo dev server', required: true, workspace: '@qyou/mobile' },
  { name: 'lint', command: 'eslint .', description: 'Run ESLint', required: true, workspace: '@qyou/mobile' },
  { name: 'typecheck', command: 'tsc --noEmit', description: 'TypeScript type check', required: true, workspace: '@qyou/mobile' },
  { name: 'test', command: 'jest', description: 'Run tests', required: false, workspace: '@qyou/mobile' },
  { name: 'android', command: 'expo start --android', description: 'Start Android dev build', required: false, workspace: '@qyou/mobile' },
  { name: 'ios', command: 'expo start --ios', description: 'Start iOS dev build', required: false, workspace: '@qyou/mobile' },
  { name: 'web', command: 'expo start --web', description: 'Start web dev build', required: false, workspace: '@qyou/mobile' },
];

const SHARED_SCRIPTS: ScriptCommand[] = [
  { name: 'build', command: 'tsc -p tsconfig.json', description: 'Compile TypeScript to dist/', required: true, workspace: '@qyou/shared' },
  { name: 'lint', command: 'eslint .', description: 'Run ESLint', required: true, workspace: '@qyou/shared' },
  { name: 'typecheck', command: 'tsc -p tsconfig.json --noEmit', description: 'TypeScript type check', required: true, workspace: '@qyou/shared' },
];

const STELLAR_SCRIPTS: ScriptCommand[] = [
  { name: 'build', command: 'tsc -p tsconfig.json', description: 'Compile TypeScript to dist/', required: true, workspace: '@qyou/stellar' },
  { name: 'lint', command: 'eslint .', description: 'Run ESLint', required: true, workspace: '@qyou/stellar' },
  { name: 'typecheck', command: 'tsc -p tsconfig.json --noEmit', description: 'TypeScript type check', required: true, workspace: '@qyou/stellar' },
];

export const PHASE4_CONTRACTS: WorkspaceScriptsPhase4Contract[] = [
  {
    workspace: 'root',
    scripts: ROOT_SCRIPTS,
    phase: 4,
    documentation: { exists: true, path: 'docs/workspace-scripts.md' },
    validation: { enforceAllDefined: true, checkCommandNonEmpty: true, verifyWorkspaceExists: true },
  },
  {
    workspace: '@qyou/api',
    scripts: API_SCRIPTS,
    phase: 4,
    documentation: { exists: false, path: 'apps/api/docs/development.md' },
    validation: { enforceAllDefined: true, checkCommandNonEmpty: true, verifyWorkspaceExists: true },
  },
  {
    workspace: '@qyou/web',
    scripts: WEB_SCRIPTS,
    phase: 4,
    documentation: { exists: false, path: 'apps/web/docs/development.md' },
    validation: { enforceAllDefined: true, checkCommandNonEmpty: true, verifyWorkspaceExists: true },
  },
  {
    workspace: '@qyou/mobile',
    scripts: MOBILE_SCRIPTS,
    phase: 4,
    documentation: { exists: false, path: 'apps/mobile/docs/development.md' },
    validation: { enforceAllDefined: true, checkCommandNonEmpty: true, verifyWorkspaceExists: true },
  },
  {
    workspace: '@qyou/shared',
    scripts: SHARED_SCRIPTS,
    phase: 4,
    documentation: { exists: false, path: 'packages/shared/docs/development.md' },
    validation: { enforceAllDefined: true, checkCommandNonEmpty: true, verifyWorkspaceExists: true },
  },
  {
    workspace: '@qyou/stellar',
    scripts: STELLAR_SCRIPTS,
    phase: 4,
    documentation: { exists: false, path: 'packages/stellar/docs/development.md' },
    validation: { enforceAllDefined: true, checkCommandNonEmpty: true, verifyWorkspaceExists: true },
  },
];

export function getPhase4Contract(name: string): WorkspaceScriptsPhase4Contract | undefined {
  return PHASE4_CONTRACTS.find((c) => c.workspace === name);
}

export function validatePhase4Contract(contract: WorkspaceScriptsPhase4Contract): string[] {
  const errors: string[] = [];
  if (contract.scripts.length === 0) errors.push(`${contract.workspace}: no scripts defined`);
  for (const script of contract.scripts) {
    if (script.required && !script.command) errors.push(`${contract.workspace}: required script "${script.name}" has no command`);
  }
  return errors;
}
