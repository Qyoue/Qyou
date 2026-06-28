export interface EnvSecretPhase5Var {
  key: string;
  description: string;
  required: boolean;
  secret: boolean;
  productionRequired: boolean;
  format: string;
  allowedValues?: string[];
  rotationDays?: number;
  minLength?: number;
  auditLog: boolean;
  encryptionRequired: boolean;
}

export interface EnvSecretPhase5Contract {
  workspace: string;
  envFile: string;
  envExampleFile: string;
  envEncryptedFile?: string;
  vars: EnvSecretPhase5Var[];
  validation: {
    requireExample: boolean;
    requireGitignore: boolean;
    minSecretLength: number;
    failOnMissingVars: boolean;
    validateFormat: boolean;
  };
  rotation: {
    enabled: boolean;
    defaultRotationDays: number;
    notifyBeforeDays: number;
  };
  audit: {
    logAccess: boolean;
    logChanges: boolean;
    retentionDays: number;
  };
  encryption: {
    requireEncrypted: boolean;
    algorithm: string;
    keyRotationDays: number;
  };
}

export const ENV_SECRET_PHASE5_CONTRACTS: EnvSecretPhase5Contract[] = [
  {
    workspace: '@qyou/api',
    envFile: 'apps/api/.env',
    envExampleFile: 'apps/api/.env.example',
    envEncryptedFile: 'apps/api/.env.encrypted',
    validation: { requireExample: true, requireGitignore: true, minSecretLength: 16, failOnMissingVars: true, validateFormat: true },
    rotation: { enabled: true, defaultRotationDays: 90, notifyBeforeDays: 14 },
    audit: { logAccess: true, logChanges: true, retentionDays: 365 },
    encryption: { requireEncrypted: true, algorithm: 'aes-256-gcm', keyRotationDays: 180 },
    vars: [
      { key: 'PORT', description: 'API server port', required: true, secret: false, productionRequired: true, format: 'number', auditLog: false, encryptionRequired: false },
      { key: 'DATABASE_URL', description: 'PostgreSQL connection string', required: true, secret: true, productionRequired: true, format: 'url', rotationDays: 90, minLength: 20, auditLog: true, encryptionRequired: true },
      { key: 'JWT_SECRET', description: 'Secret for signing access tokens', required: true, secret: true, productionRequired: true, format: 'string', rotationDays: 60, minLength: 32, auditLog: true, encryptionRequired: true },
      { key: 'JWT_EXPIRES_IN', description: 'Access token lifetime', required: true, secret: false, productionRequired: true, format: 'string', auditLog: false, encryptionRequired: false },
      { key: 'REDIS_URL', description: 'Redis connection string', required: false, secret: true, productionRequired: false, format: 'url', rotationDays: 90, minLength: 16, auditLog: true, encryptionRequired: true },
    ],
  },
  {
    workspace: '@qyou/web',
    envFile: 'apps/web/.env',
    envExampleFile: 'apps/web/.env.example',
    envEncryptedFile: 'apps/web/.env.encrypted',
    validation: { requireExample: true, requireGitignore: true, minSecretLength: 12, failOnMissingVars: true, validateFormat: true },
    rotation: { enabled: true, defaultRotationDays: 90, notifyBeforeDays: 14 },
    audit: { logAccess: true, logChanges: true, retentionDays: 365 },
    encryption: { requireEncrypted: false, algorithm: 'aes-256-gcm', keyRotationDays: 180 },
    vars: [
      { key: 'NEXT_PUBLIC_API_URL', description: 'Base URL of the API', required: true, secret: false, productionRequired: true, format: 'url', auditLog: false, encryptionRequired: false },
      { key: 'NEXT_PUBLIC_SENTRY_DSN', description: 'Sentry error tracking DSN', required: false, secret: true, productionRequired: true, format: 'url', rotationDays: 180, minLength: 20, auditLog: true, encryptionRequired: false },
    ],
  },
  {
    workspace: '@qyou/mobile',
    envFile: 'apps/mobile/.env',
    envExampleFile: 'apps/mobile/.env.example',
    validation: { requireExample: true, requireGitignore: true, minSecretLength: 12, failOnMissingVars: false, validateFormat: false },
    rotation: { enabled: true, defaultRotationDays: 90, notifyBeforeDays: 14 },
    audit: { logAccess: false, logChanges: true, retentionDays: 90 },
    encryption: { requireEncrypted: false, algorithm: 'aes-256-gcm', keyRotationDays: 180 },
    vars: [
      { key: 'EXPO_PUBLIC_API_URL', description: 'Base URL of the API', required: false, secret: false, productionRequired: false, format: 'url', auditLog: false, encryptionRequired: false },
    ],
  },
  {
    workspace: 'root',
    envFile: '.env',
    envExampleFile: '.env.example',
    envEncryptedFile: '.env.encrypted',
    validation: { requireExample: true, requireGitignore: true, minSecretLength: 16, failOnMissingVars: true, validateFormat: true },
    rotation: { enabled: true, defaultRotationDays: 90, notifyBeforeDays: 14 },
    audit: { logAccess: true, logChanges: true, retentionDays: 365 },
    encryption: { requireEncrypted: true, algorithm: 'aes-256-gcm', keyRotationDays: 180 },
    vars: [
      { key: 'NPM_TOKEN', description: 'NPM registry token for publishing', required: false, secret: true, productionRequired: false, format: 'string', rotationDays: 90, minLength: 16, auditLog: true, encryptionRequired: true },
    ],
  },
];

export function getEnvSecretPhase5Contract(name: string): EnvSecretPhase5Contract | undefined {
  return ENV_SECRET_PHASE5_CONTRACTS.find((c) => c.workspace === name);
}

export function validateEnvSecretPhase5(contract: EnvSecretPhase5Contract): string[] {
  const errors: string[] = [];
  if (!contract.validation.requireExample) errors.push(`${contract.workspace}: requireExample must be true`);
  if (!contract.validation.requireGitignore) errors.push(`${contract.workspace}: requireGitignore must be true`);
  const secrets = contract.vars.filter((v) => v.secret);
  const secretsWithoutRotation = secrets.filter((v) => v.rotationDays === undefined);
  if (secretsWithoutRotation.length > 0) errors.push(`${contract.workspace}: ${secretsWithoutRotation.length} secret(s) missing rotation policy`);
  const secretsWithoutMinLen = secrets.filter((v) => v.minLength === undefined);
  if (secretsWithoutMinLen.length > 0) errors.push(`${contract.workspace}: ${secretsWithoutMinLen.length} secret(s) missing minLength`);
  if (!contract.rotation.enabled) errors.push(`${contract.workspace}: rotation must be enabled`);
  return errors;
}
