export interface EnvVarDef {
  key: string;
  description: string;
  required: boolean;
  secret: boolean;
  defaultValue?: string;
}

export interface EnvConfigContract {
  workspace: string;
  envFile: string;
  vars: EnvVarDef[];
}

export const ENV_CONFIG_CONTRACTS: EnvConfigContract[] = [
  {
    workspace: '@qyou/api',
    envFile: 'apps/api/.env',
    vars: [
      { key: 'PORT', description: 'API server port', required: true, secret: false, defaultValue: '4000' },
      { key: 'DATABASE_URL', description: 'PostgreSQL connection string for Prisma', required: true, secret: true },
      { key: 'JWT_SECRET', description: 'Secret used to sign access tokens', required: true, secret: true, defaultValue: 'dev-secret-change-me' },
      { key: 'JWT_EXPIRES_IN', description: 'Access token lifetime', required: true, secret: false, defaultValue: '1h' },
    ],
  },
  {
    workspace: '@qyou/web',
    envFile: 'apps/web/.env',
    vars: [
      { key: 'NEXT_PUBLIC_API_URL', description: 'Base URL of the API', required: true, secret: false, defaultValue: 'http://localhost:4000' },
    ],
  },
  {
    workspace: '@qyou/mobile',
    envFile: 'apps/mobile/.env',
    vars: [
      { key: 'EXPO_PUBLIC_API_URL', description: 'Base URL of the API (reserved)', required: false, secret: false, defaultValue: 'http://localhost:4000' },
    ],
  },
];

export function getEnvContract(name: string): EnvConfigContract | undefined {
  return ENV_CONFIG_CONTRACTS.find((c) => c.workspace === name);
}

export function validateEnvFile(
  workspace: string,
  actualVars: Record<string, string>,
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const contract = getEnvContract(workspace);
  if (!contract) return { valid: true, errors: [], warnings: [] };

  for (const def of contract.vars) {
    if (def.required && !(def.key in actualVars)) {
      errors.push(`Missing required env var: ${def.key}`);
    } else if (!def.required && !(def.key in actualVars)) {
      warnings.push(`Missing optional env var: ${def.key}`);
    }
    if (def.secret && def.key in actualVars) {
      const val = actualVars[def.key];
      if (val && val.length < 8) {
        warnings.push(`Secret "${def.key}" is too short (${val.length} chars, min 8)`);
      }
    }
  }

  for (const key of Object.keys(actualVars)) {
    if (!contract.vars.some((v) => v.key === key)) {
      warnings.push(`Unknown env var: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
