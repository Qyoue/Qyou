export interface LintTypecheckPhase4Rule {
  rule: string;
  severity: 'off' | 'warn' | 'error';
  description: string;
  phase: number;
}

export interface LintTypecheckPhase4Contract {
  workspace: string;
  tsconfigPath: string;
  eslintConfigPath: string;
  eslintRules: LintTypecheckPhase4Rule[];
  strictMode: boolean;
  strictChecks: {
    noUnusedLocals: boolean;
    noUnusedParameters: boolean;
    strictNullChecks: boolean;
    exactOptionalPropertyTypes: boolean;
    noImplicitOverride: boolean;
  };
  testFramework: string;
  ciTimeout: number;
  preCommit: {
    lint: boolean;
    typecheck: boolean;
    test: boolean;
  };
}

export const PHASE4_LINT_CONTRACTS: LintTypecheckPhase4Contract[] = [
  {
    workspace: '@qyou/api',
    tsconfigPath: 'apps/api/tsconfig.json',
    eslintConfigPath: 'apps/api/eslint.config.mjs',
    eslintRules: [
      { rule: '@typescript-eslint/no-unused-vars', severity: 'error', description: 'No unused variables', phase: 4 },
      { rule: '@typescript-eslint/explicit-function-return-type', severity: 'warn', description: 'Explicit return types', phase: 4 },
      { rule: 'no-console', severity: 'warn', description: 'No console.log in production', phase: 4 },
      { rule: '@typescript-eslint/no-explicit-any', severity: 'warn', description: 'Avoid any type', phase: 4 },
    ],
    strictMode: true,
    strictChecks: { noUnusedLocals: true, noUnusedParameters: true, strictNullChecks: true, exactOptionalPropertyTypes: true, noImplicitOverride: true },
    testFramework: 'node:test',
    ciTimeout: 10,
    preCommit: { lint: true, typecheck: true, test: true },
  },
  {
    workspace: '@qyou/web',
    tsconfigPath: 'apps/web/tsconfig.json',
    eslintConfigPath: 'apps/web/eslint.config.mjs',
    eslintRules: [
      { rule: '@typescript-eslint/no-unused-vars', severity: 'error', description: 'No unused variables', phase: 4 },
      { rule: 'react-hooks/exhaustive-deps', severity: 'warn', description: 'React hooks deps', phase: 4 },
      { rule: 'no-console', severity: 'warn', description: 'No console.log in production', phase: 4 },
    ],
    strictMode: true,
    strictChecks: { noUnusedLocals: true, noUnusedParameters: true, strictNullChecks: true, exactOptionalPropertyTypes: false, noImplicitOverride: true },
    testFramework: 'jest',
    ciTimeout: 15,
    preCommit: { lint: true, typecheck: true, test: false },
  },
  {
    workspace: '@qyou/mobile',
    tsconfigPath: 'apps/mobile/tsconfig.json',
    eslintConfigPath: 'apps/mobile/eslint.config.mjs',
    eslintRules: [
      { rule: '@typescript-eslint/no-unused-vars', severity: 'error', description: 'No unused variables', phase: 4 },
      { rule: 'react-hooks/exhaustive-deps', severity: 'warn', description: 'React hooks deps', phase: 4 },
    ],
    strictMode: true,
    strictChecks: { noUnusedLocals: true, noUnusedParameters: true, strictNullChecks: true, exactOptionalPropertyTypes: false, noImplicitOverride: true },
    testFramework: 'jest',
    ciTimeout: 15,
    preCommit: { lint: true, typecheck: true, test: false },
  },
  {
    workspace: '@qyou/shared',
    tsconfigPath: 'packages/shared/tsconfig.json',
    eslintConfigPath: 'packages/shared/eslint.config.mjs',
    eslintRules: [
      { rule: '@typescript-eslint/no-unused-vars', severity: 'error', description: 'No unused variables', phase: 4 },
    ],
    strictMode: true,
    strictChecks: { noUnusedLocals: true, noUnusedParameters: true, strictNullChecks: true, exactOptionalPropertyTypes: false, noImplicitOverride: false },
    testFramework: 'none',
    ciTimeout: 5,
    preCommit: { lint: false, typecheck: true, test: false },
  },
  {
    workspace: '@qyou/stellar',
    tsconfigPath: 'packages/stellar/tsconfig.json',
    eslintConfigPath: 'packages/stellar/eslint.config.mjs',
    eslintRules: [
      { rule: '@typescript-eslint/no-unused-vars', severity: 'error', description: 'No unused variables', phase: 4 },
    ],
    strictMode: true,
    strictChecks: { noUnusedLocals: true, noUnusedParameters: true, strictNullChecks: true, exactOptionalPropertyTypes: false, noImplicitOverride: false },
    testFramework: 'none',
    ciTimeout: 5,
    preCommit: { lint: false, typecheck: true, test: false },
  },
];

export function getPhase4LintContract(name: string): LintTypecheckPhase4Contract | undefined {
  return PHASE4_LINT_CONTRACTS.find((c) => c.workspace === name);
}

export function validatePhase4LintContract(contract: LintTypecheckPhase4Contract): string[] {
  const errors: string[] = [];
  if (!contract.strictMode) errors.push(`${contract.workspace}: strict mode must be enabled`);
  const errorRules = contract.eslintRules.filter((r) => r.severity === 'error');
  if (errorRules.length < 1) errors.push(`${contract.workspace}: at least one error-severity ESLint rule required`);
  if (contract.ciTimeout < 5) errors.push(`${contract.workspace}: CI timeout must be at least 5 minutes`);
  return errors;
}
