import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  validatePackageJson,
  checkTsconfigExtends,
  formatValidationResults,
  type WorkspaceConfig,
  type ValidationResult,
} from './workspace-schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

interface WorkspaceEntry {
  path: string;
  packageJsonPath: string;
  tsconfigPath: string;
  requireBuild: boolean;
}

function readJson(filePath: string): Record<string, unknown> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read or parse ${filePath}: ${message}`);
  }
}

function discoverWorkspaces(): WorkspaceEntry[] {
  const rootPkg = readJson(resolve(ROOT, 'package.json'));
  const workspaces = rootPkg.workspaces as string[];

  if (!workspaces || !Array.isArray(workspaces)) {
    throw new Error('Root package.json does not define "workspaces" array');
  }

  const entries: WorkspaceEntry[] = [];

  for (const pattern of workspaces) {
    if (pattern === 'apps/*' || pattern === 'packages/*') {
      const dir = pattern.replace('/*', '');
      const fullDir = resolve(ROOT, dir);

      let items: string[];
      try {
        items = readdirSync(fullDir);
      } catch {
        throw new Error(`Workspace directory "${fullDir}" not found`);
      }

      for (const item of items) {
        const wsPath = resolve(fullDir, item);
        const pkgPath = resolve(wsPath, 'package.json');
        const tsconfigPath = resolve(wsPath, 'tsconfig.json');

        if (existsSync(pkgPath)) {
          const isPackage = dir === 'packages';
          entries.push({
            path: `${dir}/${item}`,
            packageJsonPath: pkgPath,
            tsconfigPath,
            requireBuild: isPackage,
          });
        }
      }
    }
  }

  return entries;
}

async function main(): Promise<void> {
  try {
    const workspaces = discoverWorkspaces();
    const results = new Map<string, ValidationResult>();

    for (const ws of workspaces) {
      const pkg = readJson(ws.packageJsonPath);
      const result = validatePackageJson(pkg, ws.path, ws.requireBuild);

      if (existsSync(ws.tsconfigPath)) {
        const tsconfig = readJson(ws.tsconfigPath);
        const extendsBase = checkTsconfigExtends(tsconfig, ws.path);

        // apps/web has its own standalone tsconfig, warn but don't error
        if (!extendsBase && !ws.path.startsWith('apps/mobile')) {
          if (!ws.path.startsWith('apps/web')) {
            result.warnings.push(`${ws.path}: tsconfig.json does not extend tsconfig.base.json`);
          }
        }
      } else {
        result.warnings.push(`${ws.path}: missing tsconfig.json`);
      }

      // Check that dist/ is gitignored
      if (pkg.scripts && typeof (pkg.scripts as Record<string, string>).build === 'string') {
        result.warnings.push(`${ws.path}: has "build" script — verify dist/ is in .gitignore`);
      }

      results.set(ws.path, result);
    }

    const output = formatValidationResults(results);
    console.log(output);

    const hasErrors = Array.from(results.values()).some((r) => r.errors.length > 0);
    if (hasErrors) {
      process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`FATAL: ${message}`);
    process.exit(2);
  }
}

main();
