export interface EslintConfigContract {
  configFile: string;
  extends: string[];
  rules: Record<string, string>;
}

export interface TypeScriptConfigContract {
  strict: boolean;
  target: string;
  module: string;
  outDir: string;
}

export interface LintTypeCheckContract {
  workspace: string;
  eslint: EslintConfigContract;
  typescript: TypeScriptConfigContract;
}

const defaultEslint: EslintConfigContract = {
  configFile: 'eslint.config.mjs',
  extends: ['@eslint/js', 'typescript-eslint', 'eslint-config-prettier'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    'no-console': 'warn',
  },
};

export const LINT_TYPECHECK_CONTRACTS: LintTypeCheckContract[] = [
  {
    workspace: '@qyou/api',
    eslint: { ...defaultEslint },
    typescript: { strict: true, target: 'ES2022', module: 'NodeNext', outDir: 'dist' },
  },
  {
    workspace: '@qyou/web',
    eslint: { ...defaultEslint },
    typescript: { strict: true, target: 'ES2022', module: 'ESNext', outDir: '.next' },
  },
  {
    workspace: '@qyou/mobile',
    eslint: { ...defaultEslint },
    typescript: { strict: true, target: 'ES2022', module: 'ESNext', outDir: 'dist' },
  },
  {
    workspace: '@qyou/shared',
    eslint: { ...defaultEslint },
    typescript: { strict: true, target: 'ES2022', module: 'NodeNext', outDir: 'dist' },
  },
  {
    workspace: '@qyou/stellar',
    eslint: { ...defaultEslint },
    typescript: { strict: true, target: 'ES2022', module: 'NodeNext', outDir: 'dist' },
  },
];

export function getLintTypeCheckContract(name: string): LintTypeCheckContract | undefined {
  return LINT_TYPECHECK_CONTRACTS.find((c) => c.workspace === name);
}
