export interface EnvVar {
  key: string;
  required: boolean;
  secret: boolean;
  format: string;
}

export interface EnvSecretPhase4Contract {
  workspace: string;
  envExampleFile: string;
  vars: EnvVar[];
  requireExample: boolean;
  requireGitignore: boolean;
  secretMinLength: number;
  rotationDays: number;
}

export const ENV_SECRET_PHASE4_CONTRACTS: EnvSecretPhase4Contract[] = [
  {
    workspace: '@qyou/api',
    envExampleFile: 'apps/api/.env.example',
    vars: [
      { key: 'PORT', required: true, secret: false, format: 'number' },
      { key: 'DATABASE_URL', required: true, secret: true, format: 'url' },
      { key: 'JWT_SECRET', required: true, secret: true, format: 'string' },
      { key: 'JWT_EXPIRES_IN', required: true, secret: false, format: 'string' },
      { key: 'REDIS_URL', required: false, secret: true, format: 'url' },
    ],
    requireExample: true,
    requireGitignore: true,
    secretMinLength: 16,
    rotationDays: 90,
  },
  {
    workspace: '@qyou/web',
    envExampleFile: 'apps/web/.env.example',
    vars: [
      { key: 'NEXT_PUBLIC_API_URL', required: true, secret: false, format: 'url' },
      { key: 'NEXT_PUBLIC_SENTRY_DSN', required: false, secret: true, format: 'url' },
    ],
    requireExample: true,
    requireGitignore: true,
    secretMinLength: 12,
    rotationDays: 180,
  },
  {
    workspace: '@qyou/mobile',
    envExampleFile: 'apps/mobile/.env.example',
    vars: [
      { key: 'EXPO_PUBLIC_API_URL', required: false, secret: false, format: 'url' },
    ],
    requireExample: true,
    requireGitignore: true,
    secretMinLength: 12,
    rotationDays: 90,
  },
  {
    workspace: 'root',
    envExampleFile: '.env.example',
    vars: [
      { key: 'NPM_TOKEN', required: false, secret: true, format: 'string' },
    ],
    requireExample: true,
    requireGitignore: true,
    secretMinLength: 16,
    rotationDays: 90,
  },
];

export function getEnvSecretPhase4Contract(name: string): EnvSecretPhase4Contract | undefined {
  return ENV_SECRET_PHASE4_CONTRACTS.find((c) => c.workspace === name);
}

export function validateEnvSecretPhase4Contract(contract: EnvSecretPhase4Contract): string[] {
  const errors: string[] = [];
  if (!contract.requireExample) errors.push(`${contract.workspace}: requireExample must be true`);
  if (!contract.requireGitignore) errors.push(`${contract.workspace}: requireGitignore must be true`);
  const secrets = contract.vars.filter((v) => v.secret);
  if (secrets.length > 0 && contract.secretMinLength < 8) errors.push(`${contract.workspace}: secretMinLength must be at least 8`);
  if (contract.rotationDays < 30) errors.push(`${contract.workspace}: rotationDays must be at least 30`);
  return errors;
}
