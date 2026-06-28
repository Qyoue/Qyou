export interface LintTypeCheckTestContract {
  workspace: string;
  hasLintScript: boolean;
  hasTypeCheckScript: boolean;
  hasTestScript: boolean;
  lintCommand: string;
  typeCheckCommand: string;
  testCommand: string;
  testFramework: string;
}

const knownContracts: Record<string, Partial<LintTypeCheckTestContract>> = {
  '@qyou/api': {
    lintCommand: 'eslint .',
    typeCheckCommand: 'tsc -p tsconfig.json --noEmit',
    testCommand: 'node --import tsx --test src/modules/auth/tests/*.test.ts',
    testFramework: 'node:test',
  },
  '@qyou/web': {
    lintCommand: 'eslint .',
    typeCheckCommand: 'tsc --noEmit',
    testCommand: 'jest',
    testFramework: 'jest',
  },
  '@qyou/mobile': {
    lintCommand: 'eslint .',
    typeCheckCommand: 'tsc --noEmit',
    testCommand: 'jest',
    testFramework: 'jest',
  },
  '@qyou/shared': {
    lintCommand: 'eslint .',
    typeCheckCommand: 'tsc -p tsconfig.json --noEmit',
    testCommand: 'echo \"@qyou/shared has no runtime tests\"',
    testFramework: 'none',
  },
  '@qyou/stellar': {
    lintCommand: 'eslint .',
    typeCheckCommand: 'tsc -p tsconfig.json --noEmit',
    testCommand: 'echo \"@qyou/stellar has no runtime tests\"',
    testFramework: 'none',
  },
};

export function getContract(name: string): LintTypeCheckTestContract | null {
  const partial = knownContracts[name];
  if (!partial) return null;
  return {
    workspace: name,
    hasLintScript: true,
    hasTypeCheckScript: true,
    hasTestScript: true,
    lintCommand: partial.lintCommand || '',
    typeCheckCommand: partial.typeCheckCommand || '',
    testCommand: partial.testCommand || '',
    testFramework: partial.testFramework || 'unknown',
  };
}

export function validateWorkspaceConfig(
  name: string,
  actualScripts: Record<string, string>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const contract = getContract(name);
  if (!contract) return { valid: true, errors: [] };

  if (!actualScripts.lint) errors.push(`${name}: missing "lint" script`);
  if (!actualScripts.typecheck) errors.push(`${name}: missing "typecheck" script`);
  if (!actualScripts.test) errors.push(`${name}: missing "test" script`);

  if (actualScripts.lint && actualScripts.lint !== contract.lintCommand) {
    errors.push(`${name}: "lint" script differs from contract (expected: ${contract.lintCommand})`);
  }

  return { valid: errors.length === 0, errors };
}
