import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface HardenReport {
  workspace: string;
  errors: string[];
  warnings: string[];
}

function checkWorkspaceScripts(workspacePath: string, workspaceName: string, monorepoRoot: string): HardenReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const pkgPath = resolve(workspacePath, 'package.json');

  if (!existsSync(pkgPath)) {
    errors.push('package.json not found');
    return { workspace: workspaceName, errors, warnings };
  }

  let pkg: Record<string, unknown>;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    errors.push('package.json is not valid JSON');
    return { workspace: workspaceName, errors, warnings };
  }

  const scripts: Record<string, string> = (pkg.scripts as Record<string, string>) || {};

  for (const [name, cmd] of Object.entries(scripts)) {
    if (!cmd.trim()) {
      errors.push(`"${name}" script is empty`);
    }
  }

  for (const [name, cmd] of Object.entries(scripts)) {
    const depMatch = cmd.match(/-w\s+(\S+)/g);
    if (depMatch) {
      for (const dep of depMatch) {
        const depName = dep.replace('-w ', '').trim();
        if (depName.startsWith('@qyou/')) {
          const shortName = depName.replace('@qyou/', '');
          const pkgDepPath = resolve(monorepoRoot, 'packages', shortName, 'package.json');
          const appDepPath = resolve(monorepoRoot, 'apps', shortName, 'package.json');
          if (!existsSync(pkgDepPath) && !existsSync(appDepPath)) {
            warnings.push(`"${name}" references unknown workspace "${depName}"`);
          }
        }
      }
    }

    if (cmd.includes('&&') && !cmd.includes('set -e') && !cmd.includes('||')) {
      warnings.push(`"${name}" uses chained commands without error handling`);
    }
  }

  return { workspace: workspaceName, errors, warnings };
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  const workspaceDirs: [string, string][] = [
    ...['api', 'web', 'mobile'].map((d) => [resolve(root, 'apps', d), `@qyou/${d}`] as [string, string]),
    ...['shared', 'stellar'].map((d) => [resolve(root, 'packages', d), `@qyou/${d}`] as [string, string]),
  ];

  const rootReport = checkWorkspaceScripts(root, 'root', root);
  for (const err of rootReport.errors) {
    console.error(`ERROR: root — ${err}`);
    exitCode = 1;
  }
  for (const warn of rootReport.warnings) {
    console.warn(`WARN: root — ${warn}`);
  }

  for (const [wPath, wName] of workspaceDirs) {
    const report = checkWorkspaceScripts(wPath, wName, root);
    for (const err of report.errors) {
      console.error(`ERROR: ${wName} — ${err}`);
      exitCode = 1;
    }
    for (const warn of report.warnings) {
      console.warn(`WARN: ${wName} — ${warn}`);
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('workspace-hardening-phase3.ts')) main();
