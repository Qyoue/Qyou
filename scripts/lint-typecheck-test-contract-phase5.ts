export interface LintTypecheckTestPhase5Rule {
  ruleName: string;
  description: string;
  requiredSeverity: 'error' | 'warn';
  targetFiles: string[];
}

export interface LintTypecheckTestPhase5Ergonomics {
  workspace: string;
  tsconfigPath: string;
  eslintConfigPath: string;
  strictRules: LintTypecheckTestPhase5Rule[];
  preCommit: {
    enabled: boolean;
    hooks: string[];
    maxStagedLines: number;
  };
  ciIntegration: {
    failOnLintError: boolean;
    failOnTypeError: boolean;
    runTests: boolean;
    parallelJobs: boolean;
    timeoutMinutes: number;
  };
  testFramework: {
    runner: string;
    coverageThreshold: number;
    watchMode: boolean;
    testPattern: string;
  };
  ide: {
    recommendExtensions: string[];
    recommendSettings: Record<string, boolean>;
  };
}

const TS_STRICT_RULES: LintTypecheckTestPhase5Rule[] = [
  { ruleName: 'strict', description: 'Enable all strict type checking options', requiredSeverity: 'error', targetFiles: ['tsconfig.json'] },
  { ruleName: 'noUnusedLocals', description: 'Report unused local variables', requiredSeverity: 'error', targetFiles: ['tsconfig.json'] },
  { ruleName: 'noUnusedParameters', description: 'Report unused function parameters', requiredSeverity: 'error', targetFiles: ['tsconfig.json'] },
  { ruleName: 'strictNullChecks', description: 'Ensure null/undefined are handled', requiredSeverity: 'error', targetFiles: ['tsconfig.json'] },
  { ruleName: 'exactOptionalPropertyTypes', description: 'Treat optional properties strictly', requiredSeverity: 'warn', targetFiles: ['tsconfig.json'] },
  { ruleName: 'noImplicitOverride', description: 'Require override keyword', requiredSeverity: 'error', targetFiles: ['tsconfig.json'] },
];

const ESLINT_RULES: LintTypecheckTestPhase5Rule[] = [
  { ruleName: '@typescript-eslint/no-unused-vars', description: 'No unused variables', requiredSeverity: 'error', targetFiles: ['eslint.config.mjs'] },
  { ruleName: '@typescript-eslint/no-explicit-any', description: 'Avoid any type', requiredSeverity: 'warn', targetFiles: ['eslint.config.mjs'] },
  { ruleName: 'no-console', description: 'No console.log in production', requiredSeverity: 'warn', targetFiles: ['eslint.config.mjs'] },
  { ruleName: '@typescript-eslint/prefer-readonly', description: 'Prefer readonly properties', requiredSeverity: 'warn', targetFiles: ['eslint.config.mjs'] },
];

export const LINT_TYPECHECK_TEST_PHASE5_CONTRACTS: LintTypecheckTestPhase5Ergonomics[] = [
  {
    workspace: '@qyou/api',
    tsconfigPath: 'apps/api/tsconfig.json',
    eslintConfigPath: 'apps/api/eslint.config.mjs',
    strictRules: [...TS_STRICT_RULES, ...ESLINT_RULES],
    preCommit: {
      enabled: true,
      hooks: ['lint-staged', 'typecheck', 'test:changed'],
      maxStagedLines: 500,
    },
    ciIntegration: {
      failOnLintError: true,
      failOnTypeError: true,
      runTests: true,
      parallelJobs: true,
      timeoutMinutes: 10,
    },
    testFramework: {
      runner: 'node --test',
      coverageThreshold: 80,
      watchMode: true,
      testPattern: 'scripts/__tests__/**/*.test.ts',
    },
    ide: {
      recommendExtensions: ['dbaeumer.vscode-eslint', 'orta.vscode-jest'],
      recommendSettings: { 'typescript.reportStyleChecksAsWarnings': true, 'editor.codeActionsOnSave': ['source.fixAll.eslint'] },
    },
  },
  {
    workspace: '@qyou/web',
    tsconfigPath: 'apps/web/tsconfig.json',
    eslintConfigPath: 'apps/web/eslint.config.mjs',
    strictRules: [...TS_STRICT_RULES, ...ESLINT_RULES],
    preCommit: {
      enabled: true,
      hooks: ['lint-staged', 'typecheck'],
      maxStagedLines: 500,
    },
    ciIntegration: {
      failOnLintError: true,
      failOnTypeError: true,
      runTests: true,
      parallelJobs: true,
      timeoutMinutes: 10,
    },
    testFramework: {
      runner: 'jest',
      coverageThreshold: 70,
      watchMode: true,
      testPattern: '**/*.test.{ts,tsx}',
    },
    ide: {
      recommendExtensions: ['dbaeumer.vscode-eslint', 'orta.vscode-jest'],
      recommendSettings: { 'typescript.reportStyleChecksAsWarnings': true, 'editor.codeActionsOnSave': ['source.fixAll.eslint'] },
    },
  },
  {
    workspace: '@qyou/mobile',
    tsconfigPath: 'apps/mobile/tsconfig.json',
    eslintConfigPath: 'apps/mobile/eslint.config.mjs',
    strictRules: TS_STRICT_RULES,
    preCommit: {
      enabled: true,
      hooks: ['lint-staged', 'typecheck'],
      maxStagedLines: 500,
    },
    ciIntegration: {
      failOnLintError: true,
      failOnTypeError: true,
      runTests: true,
      parallelJobs: false,
      timeoutMinutes: 15,
    },
    testFramework: {
      runner: 'jest',
      coverageThreshold: 60,
      watchMode: false,
      testPattern: '**/*.test.{ts,tsx}',
    },
    ide: {
      recommendExtensions: ['dbaeumer.vscode-eslint', 'expo.vscode-expo-tools'],
      recommendSettings: { 'typescript.reportStyleChecksAsWarnings': true },
    },
  },
  {
    workspace: '@qyou/shared',
    tsconfigPath: 'packages/shared/tsconfig.json',
    eslintConfigPath: 'packages/shared/eslint.config.mjs',
    strictRules: [...TS_STRICT_RULES, ...ESLINT_RULES],
    preCommit: {
      enabled: true,
      hooks: ['typecheck'],
      maxStagedLines: 300,
    },
    ciIntegration: {
      failOnLintError: true,
      failOnTypeError: true,
      runTests: true,
      parallelJobs: true,
      timeoutMinutes: 5,
    },
    testFramework: {
      runner: 'node --test',
      coverageThreshold: 90,
      watchMode: true,
      testPattern: 'scripts/__tests__/**/*.test.ts',
    },
    ide: {
      recommendExtensions: ['dbaeumer.vscode-eslint'],
      recommendSettings: { 'typescript.reportStyleChecksAsWarnings': true },
    },
  },
  {
    workspace: '@qyou/stellar',
    tsconfigPath: 'packages/stellar/tsconfig.json',
    eslintConfigPath: 'packages/stellar/eslint.config.mjs',
    strictRules: TS_STRICT_RULES,
    preCommit: {
      enabled: true,
      hooks: ['typecheck', 'test'],
      maxStagedLines: 300,
    },
    ciIntegration: {
      failOnLintError: false,
      failOnTypeError: true,
      runTests: true,
      parallelJobs: true,
      timeoutMinutes: 10,
    },
    testFramework: {
      runner: 'node --test',
      coverageThreshold: 75,
      watchMode: false,
      testPattern: 'scripts/__tests__/**/*.test.ts',
    },
    ide: {
      recommendExtensions: ['stellar.stellar-vscode'],
      recommendSettings: { 'typescript.reportStyleChecksAsWarnings': true },
    },
  },
];

export function getLintTypecheckTestPhase5Contract(name: string): LintTypecheckTestPhase5Ergonomics | undefined {
  return LINT_TYPECHECK_TEST_PHASE5_CONTRACTS.find((c) => c.workspace === name);
}

export function validateLintErgonomicsPhase5(contract: LintTypecheckTestPhase5Ergonomics): string[] {
  const errors: string[] = [];
  const requiredRules = contract.strictRules.filter((r) => r.requiredSeverity === 'error');
  if (requiredRules.length < 4) errors.push(`${contract.workspace}: at least 4 error-severity rules required`);
  if (!contract.preCommit.enabled) errors.push(`${contract.workspace}: pre-commit hooks must be enabled`);
  if (contract.ciIntegration.timeoutMinutes < 5) errors.push(`${contract.workspace}: CI timeout must be at least 5 minutes`);
  if (contract.testFramework.coverageThreshold < 50) errors.push(`${contract.workspace}: coverage threshold must be at least 50%`);
  return errors;
}
