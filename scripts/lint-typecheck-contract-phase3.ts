export interface EslintRuleConfig {
  rule: string;
  severity: 'off' | 'warn' | 'error';
  description: string;
}

export interface TypeCheckConfig {
  noUnusedLocals: boolean;
  noUnusedParameters: boolean;
  strictNullChecks: boolean;
  exactOptionalPropertyTypes: boolean;
}

export interface LintTypeCheckContractPhase3 {
  workspace: string;
  expectedEslintRules: EslintRuleConfig[];
  expectedTypeCheckSettings: TypeCheckConfig;
  testFramework: string;
  testMatch: string[];
  ciTimeout: number;
}

export const PHASE3_CONTRACTS: LintTypeCheckContractPhase3[] = [
  {
    workspace: '@qyou/api',
    expectedEslintRules: [
      { rule: '@typescript-eslint/no-unused-vars', severity: 'error', description: 'No unused variables' },
      { rule: '@typescript-eslint/explicit-function-return-type', severity: 'warn', description: 'Explicit return types' },
      { rule: 'no-console', severity: 'warn', description: 'No console.log in production' },
    ],
    expectedTypeCheckSettings: {
      noUnusedLocals: true,
      noUnusedParameters: true,
      strictNullChecks: true,
      exactOptionalPropertyTypes: false,
    },
    testFramework: 'node:test',
    testMatch: ['src/**/*.test.ts'],
    ciTimeout: 10,
  },
  {
    workspace: '@qyou/web',
    expectedEslintRules: [
      { rule: '@typescript-eslint/no-unused-vars', severity: 'error', description: 'No unused variables' },
      { rule: 'react-hooks/exhaustive-deps', severity: 'warn', description: 'React hooks deps' },
    ],
    expectedTypeCheckSettings: {
      noUnusedLocals: true,
      noUnusedParameters: true,
      strictNullChecks: true,
      exactOptionalPropertyTypes: false,
    },
    testFramework: 'jest',
    testMatch: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    ciTimeout: 15,
  },
  {
    workspace: '@qyou/mobile',
    expectedEslintRules: [
      { rule: '@typescript-eslint/no-unused-vars', severity: 'error', description: 'No unused variables' },
      { rule: 'react-hooks/exhaustive-deps', severity: 'warn', description: 'React hooks deps' },
    ],
    expectedTypeCheckSettings: {
      noUnusedLocals: true,
      noUnusedParameters: true,
      strictNullChecks: true,
      exactOptionalPropertyTypes: false,
    },
    testFramework: 'jest',
    testMatch: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    ciTimeout: 15,
  },
  {
    workspace: '@qyou/shared',
    expectedEslintRules: [
      { rule: '@typescript-eslint/no-unused-vars', severity: 'error', description: 'No unused variables' },
    ],
    expectedTypeCheckSettings: {
      noUnusedLocals: true,
      noUnusedParameters: true,
      strictNullChecks: true,
      exactOptionalPropertyTypes: false,
    },
    testFramework: 'none',
    testMatch: [],
    ciTimeout: 5,
  },
  {
    workspace: '@qyou/stellar',
    expectedEslintRules: [
      { rule: '@typescript-eslint/no-unused-vars', severity: 'error', description: 'No unused variables' },
    ],
    expectedTypeCheckSettings: {
      noUnusedLocals: true,
      noUnusedParameters: true,
      strictNullChecks: true,
      exactOptionalPropertyTypes: false,
    },
    testFramework: 'none',
    testMatch: [],
    ciTimeout: 5,
  },
];

export function getPhase3Contract(name: string): LintTypeCheckContractPhase3 | undefined {
  return PHASE3_CONTRACTS.find((c) => c.workspace === name);
}
