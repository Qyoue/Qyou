export interface ScriptDependencyPhase5 {
  script: string;
  dependsOn: string[];
  postBuild: string[];
  requiredEnvVars: string[];
  timeout: number;
  retryOnFailure: boolean;
}

export interface WorkspaceScriptsPhase5Contract {
  workspace: string;
  scripts: ScriptDependencyPhase5[];
  buildOrder: number;
  isSharedPackage: boolean;
  boundary: {
    allowedImports: string[];
    forbiddenImports: string[];
    strictMode: boolean;
  };
}

export const PHASE5_CONTRACTS: WorkspaceScriptsPhase5Contract[] = [
  {
    workspace: '@qyou/api',
    buildOrder: 3,
    isSharedPackage: false,
    scripts: [
      { script: 'build', dependsOn: ['@qyou/shared'], postBuild: ['prisma:generate'], requiredEnvVars: ['DATABASE_URL', 'JWT_SECRET'], timeout: 120, retryOnFailure: true },
      { script: 'test', dependsOn: ['build'], postBuild: [], requiredEnvVars: [], timeout: 60, retryOnFailure: false },
      { script: 'dev', dependsOn: ['@qyou/shared'], postBuild: [], requiredEnvVars: ['DATABASE_URL', 'JWT_SECRET'], timeout: 0, retryOnFailure: false },
      { script: 'lint', dependsOn: [], postBuild: [], requiredEnvVars: [], timeout: 30, retryOnFailure: false },
      { script: 'typecheck', dependsOn: [], postBuild: [], requiredEnvVars: [], timeout: 30, retryOnFailure: false },
    ],
    boundary: {
      allowedImports: ['@qyou/shared', '@qyou/stellar'],
      forbiddenImports: ['@qyou/web', '@qyou/mobile'],
      strictMode: true,
    },
  },
  {
    workspace: '@qyou/web',
    buildOrder: 4,
    isSharedPackage: false,
    scripts: [
      { script: 'build', dependsOn: ['@qyou/shared', '@qyou/api'], postBuild: [], requiredEnvVars: ['NEXT_PUBLIC_API_URL'], timeout: 180, retryOnFailure: true },
      { script: 'test', dependsOn: ['build'], postBuild: [], requiredEnvVars: [], timeout: 60, retryOnFailure: true },
      { script: 'dev', dependsOn: ['@qyou/shared'], postBuild: [], requiredEnvVars: ['NEXT_PUBLIC_API_URL'], timeout: 0, retryOnFailure: false },
      { script: 'lint', dependsOn: [], postBuild: [], requiredEnvVars: [], timeout: 30, retryOnFailure: false },
      { script: 'typecheck', dependsOn: [], postBuild: [], requiredEnvVars: [], timeout: 30, retryOnFailure: false },
    ],
    boundary: {
      allowedImports: ['@qyou/shared'],
      forbiddenImports: ['@qyou/stellar', '@qyou/mobile', '@qyou/api'],
      strictMode: true,
    },
  },
  {
    workspace: '@qyou/mobile',
    buildOrder: 5,
    isSharedPackage: false,
    scripts: [
      { script: 'dev', dependsOn: ['@qyou/shared'], postBuild: [], requiredEnvVars: [], timeout: 0, retryOnFailure: false },
      { script: 'test', dependsOn: ['@qyou/shared'], postBuild: [], requiredEnvVars: [], timeout: 120, retryOnFailure: true },
      { script: 'lint', dependsOn: [], postBuild: [], requiredEnvVars: [], timeout: 30, retryOnFailure: false },
      { script: 'typecheck', dependsOn: [], postBuild: [], requiredEnvVars: [], timeout: 30, retryOnFailure: false },
      { script: 'build', dependsOn: ['@qyou/shared'], postBuild: [], requiredEnvVars: [], timeout: 180, retryOnFailure: true },
    ],
    boundary: {
      allowedImports: ['@qyou/shared'],
      forbiddenImports: ['@qyou/stellar', '@qyou/web', '@qyou/api'],
      strictMode: true,
    },
  },
  {
    workspace: '@qyou/shared',
    buildOrder: 1,
    isSharedPackage: true,
    scripts: [
      { script: 'build', dependsOn: [], postBuild: [], requiredEnvVars: [], timeout: 60, retryOnFailure: false },
      { script: 'lint', dependsOn: [], postBuild: [], requiredEnvVars: [], timeout: 30, retryOnFailure: false },
      { script: 'typecheck', dependsOn: [], postBuild: [], requiredEnvVars: [], timeout: 30, retryOnFailure: false },
    ],
    boundary: {
      allowedImports: [],
      forbiddenImports: ['@qyou/api', '@qyou/web', '@qyou/mobile', '@qyou/stellar'],
      strictMode: true,
    },
  },
  {
    workspace: '@qyou/stellar',
    buildOrder: 2,
    isSharedPackage: true,
    scripts: [
      { script: 'build', dependsOn: ['@qyou/shared'], postBuild: [], requiredEnvVars: [], timeout: 60, retryOnFailure: false },
      { script: 'lint', dependsOn: [], postBuild: [], requiredEnvVars: [], timeout: 30, retryOnFailure: false },
      { script: 'typecheck', dependsOn: [], postBuild: [], requiredEnvVars: [], timeout: 30, retryOnFailure: false },
    ],
    boundary: {
      allowedImports: ['@qyou/shared'],
      forbiddenImports: ['@qyou/api', '@qyou/web', '@qyou/mobile'],
      strictMode: true,
    },
  },
];

export function getPhase5Contract(name: string): WorkspaceScriptsPhase5Contract | undefined {
  return PHASE5_CONTRACTS.find((c) => c.workspace === name);
}

export function validatePhase5Contract(contract: WorkspaceScriptsPhase5Contract): string[] {
  const errors: string[] = [];
  if (contract.scripts.length === 0) errors.push(`${contract.workspace}: no scripts defined`);
  if (contract.buildOrder < 1) errors.push(`${contract.workspace}: buildOrder must be at least 1`);
  for (const script of contract.scripts) {
    if (script.timeout < 0) errors.push(`${contract.workspace}: script "${script.script}" has negative timeout`);
  }
  if (contract.boundary.forbiddenImports.length === 0 && contract.workspace !== '@qyou/shared') {
    errors.push(`${contract.workspace}: must define forbidden imports`);
  }
  return errors;
}
