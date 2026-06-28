export interface ScriptDependency {
  script: string;
  dependsOn: string[];
  postBuild: string[];
  requiredEnvVars: string[];
}

export interface WorkspaceScriptsPhase3Contract {
  workspace: string;
  scripts: ScriptDependency[];
  buildOrder: number;
  isSharedPackage: boolean;
}

export const PHASE3_CONTRACTS: WorkspaceScriptsPhase3Contract[] = [
  {
    workspace: '@qyou/api',
    buildOrder: 3,
    isSharedPackage: false,
    scripts: [
      { script: 'build', dependsOn: ['@qyou/shared'], postBuild: ['db:migrate'], requiredEnvVars: ['DATABASE_URL', 'JWT_SECRET'] },
      { script: 'test', dependsOn: ['build'], postBuild: [], requiredEnvVars: [] },
      { script: 'dev', dependsOn: ['@qyou/shared'], postBuild: [], requiredEnvVars: ['DATABASE_URL', 'JWT_SECRET'] },
    ],
  },
  {
    workspace: '@qyou/web',
    buildOrder: 4,
    isSharedPackage: false,
    scripts: [
      { script: 'build', dependsOn: ['@qyou/shared', '@qyou/api'], postBuild: [], requiredEnvVars: ['NEXT_PUBLIC_API_URL'] },
      { script: 'test', dependsOn: ['build'], postBuild: [], requiredEnvVars: [] },
    ],
  },
  {
    workspace: '@qyou/mobile',
    buildOrder: 5,
    isSharedPackage: false,
    scripts: [
      { script: 'dev', dependsOn: ['@qyou/shared'], postBuild: [], requiredEnvVars: [] },
      { script: 'test', dependsOn: ['@qyou/shared'], postBuild: [], requiredEnvVars: [] },
    ],
  },
  {
    workspace: '@qyou/shared',
    buildOrder: 1,
    isSharedPackage: true,
    scripts: [
      { script: 'build', dependsOn: [], postBuild: [], requiredEnvVars: [] },
    ],
  },
  {
    workspace: '@qyou/stellar',
    buildOrder: 2,
    isSharedPackage: true,
    scripts: [
      { script: 'build', dependsOn: ['@qyou/shared'], postBuild: [], requiredEnvVars: [] },
    ],
  },
];

export function getPhase3Contract(name: string): WorkspaceScriptsPhase3Contract | undefined {
  return PHASE3_CONTRACTS.find((c) => c.workspace === name);
}

export function validateBuildOrder(workspaces: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const ordered = [...PHASE3_CONTRACTS].sort((a, b) => a.buildOrder - b.buildOrder);

  for (let i = 0; i < ordered.length; i++) {
    for (const dep of ordered[i].scripts.flatMap((s) => s.dependsOn)) {
      const depWorkspace = ordered.find((w) => w.workspace === dep);
      if (depWorkspace && depWorkspace.buildOrder > ordered[i].buildOrder) {
        errors.push(`${ordered[i].workspace} depends on ${dep} which builds later`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
