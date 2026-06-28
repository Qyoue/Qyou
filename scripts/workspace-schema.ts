export interface WorkspaceConfig {
  name: string;
  version: string;
  private: boolean;
  hasTypeCheck: boolean;
  hasLint: boolean;
  hasTest: boolean;
  hasBuild: boolean;
  extendsBaseTsconfig: boolean;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const REQUIRED_SCRIPTS = ['typecheck', 'lint', 'test'] as const;
const BUILD_REQUIRED_SCRIPTS = [...REQUIRED_SCRIPTS, 'build'] as const;

export function validatePackageJson(
  pkg: Record<string, unknown>,
  workspacePath: string,
  requireBuild: boolean,
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!pkg.name || typeof pkg.name !== 'string') {
    errors.push(`${workspacePath}: missing or invalid "name"`);
  } else if (!pkg.name.startsWith('@qyou/')) {
    warnings.push(`${workspacePath}: package name "${pkg.name}" does not follow @qyou/* convention`);
  }

  if (!pkg.private) {
    warnings.push(`${workspacePath}: package should be marked "private": true`);
  }

  const scripts = (pkg.scripts as Record<string, string>) || {};
  const required = requireBuild ? BUILD_REQUIRED_SCRIPTS : REQUIRED_SCRIPTS;

  for (const script of required) {
    if (!scripts[script]) {
      errors.push(`${workspacePath}: missing required script "${script}"`);
    }
  }

  const deps = (pkg.dependencies as Record<string, string>) || {};
  const devDeps = (pkg.devDependencies as Record<string, string>) || {};

  for (const [dep, version] of Object.entries(deps)) {
    if (dep.startsWith('@qyou/') && version !== '*') {
      errors.push(`${workspacePath}: internal dep "${dep}" should use "*" not "${version}"`);
    }
  }

  for (const [dep, version] of Object.entries(devDeps)) {
    if (dep.startsWith('@qyou/') && version !== '*') {
      errors.push(`${workspacePath}: internal devDep "${dep}" should use "*" not "${version}"`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function checkTsconfigExtends(
  tsconfig: Record<string, unknown>,
  workspacePath: string,
): boolean {
  const extendsVal = tsconfig.extends;
  if (!extendsVal) {
    return false;
  }
  return String(extendsVal).includes('tsconfig.base.json');
}

export function formatValidationResults(results: Map<string, ValidationResult>): string {
  const lines: string[] = [];
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const [workspace, result] of results) {
    if (result.errors.length === 0 && result.warnings.length === 0) continue;

    if (result.errors.length > 0 || result.warnings.length > 0) {
      lines.push(`\n${workspace}:`);
    }

    for (const err of result.errors) {
      lines.push(`  ERROR: ${err}`);
      totalErrors++;
    }
    for (const warn of result.warnings) {
      lines.push(`  WARN:  ${warn}`);
      totalWarnings++;
    }
  }

  lines.push(`\n${totalErrors} error(s), ${totalWarnings} warning(s)`);
  return lines.join('\n');
}
