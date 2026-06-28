export interface EnvVarDefPhase3 {
  key: string;
  description: string;
  required: boolean;
  secret: boolean;
  productionRequired: boolean;
  format?: string;
  allowedValues?: string[];
}

export interface EnvContractPhase3 {
  workspace: string;
  envFile: string;
  envExampleFile: string;
  vars: EnvVarDefPhase3[];
  validation: {
    requireExample: boolean;
    requireGitignore: boolean;
    minSecretLength: number;
  };
}

export const ENV_CONTRACTS_PHASE3: EnvContractPhase3[] = [
  {
    workspace: '@qyou/api',
    envFile: 'apps/api/.env',
    envExampleFile: 'apps/api/.env.example',
    validation: { requireExample: true, requireGitignore: true, minSecretLength: 12 },
    vars: [
      { key: 'PORT', description: 'API server port', required: true, secret: false, productionRequired: true, format: 'number' },
      { key: 'DATABASE_URL', description: 'PostgreSQL connection string', required: true, secret: true, productionRequired: true, format: 'url' },
      { key: 'JWT_SECRET', description: 'Secret for signing access tokens', required: true, secret: true, productionRequired: true, format: 'string', allowedValues: undefined },
      { key: 'JWT_EXPIRES_IN', description: 'Access token lifetime', required: true, secret: false, productionRequired: true, format: 'string' },
    ],
  },
  {
    workspace: '@qyou/web',
    envFile: 'apps/web/.env',
    envExampleFile: 'apps/web/.env.example',
    validation: { requireExample: true, requireGitignore: true, minSecretLength: 8 },
    vars: [
      { key: 'NEXT_PUBLIC_API_URL', description: 'Base URL of the API', required: true, secret: false, productionRequired: true, format: 'url' },
    ],
  },
  {
    workspace: '@qyou/mobile',
    envFile: 'apps/mobile/.env',
    envExampleFile: 'apps/mobile/.env.example',
    validation: { requireExample: true, requireGitignore: true, minSecretLength: 8 },
    vars: [
      { key: 'EXPO_PUBLIC_API_URL', description: 'Base URL of the API', required: false, secret: false, productionRequired: false, format: 'url' },
    ],
  },
];

export function getEnvContractPhase3(name: string): EnvContractPhase3 | undefined {
  return ENV_CONTRACTS_PHASE3.find((c) => c.workspace === name);
}
