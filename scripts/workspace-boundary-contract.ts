export interface ScriptContract {
  script: string;
  description: string;
  workspaces: string[];
  dependencies: string[];
  required: boolean;
}

export const SCRIPT_CONTRACTS: ScriptContract[] = [
  {
    script: 'build',
    description: 'Compile TypeScript to dist/',
    workspaces: ['@qyou/api', '@qyou/web', '@qyou/shared', '@qyou/stellar'],
    dependencies: ['@qyou/shared', '@qyou/stellar'],
    required: true,
  },
  {
    script: 'lint',
    description: 'Run ESLint across the workspace',
    workspaces: ['@qyou/api', '@qyou/web', '@qyou/mobile', '@qyou/shared', '@qyou/stellar'],
    dependencies: [],
    required: true,
  },
  {
    script: 'test',
    description: 'Run workspace tests',
    workspaces: ['@qyou/api', '@qyou/web', '@qyou/mobile'],
    dependencies: ['build'],
    required: true,
  },
  {
    script: 'typecheck',
    description: 'Run TypeScript type checking without emitting',
    workspaces: ['@qyou/api', '@qyou/web', '@qyou/mobile', '@qyou/shared', '@qyou/stellar'],
    dependencies: [],
    required: false,
  },
  {
    script: 'dev',
    description: 'Start development server',
    workspaces: ['@qyou/api', '@qyou/web', '@qyou/mobile'],
    dependencies: [],
    required: false,
  },
];

export function getContractForWorkspace(name: string): ScriptContract[] {
  return SCRIPT_CONTRACTS.filter((c) => c.workspaces.includes(name));
}

export function validateScriptBoundary(
  workspace: string,
  declaredScripts: string[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const contracts = getContractForWorkspace(workspace);

  for (const contract of contracts) {
    if (contract.required && !declaredScripts.includes(contract.script)) {
      errors.push(`${workspace}: missing required script "${contract.script}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}
