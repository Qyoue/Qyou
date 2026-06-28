import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

interface EnvVarInfo {
  name: string;
  exampleValue: string;
  documented: boolean;
  hasDefault: boolean;
}

function readLines(filePath: string): string[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
  } catch {
    return [];
  }
}

function parseEnvExample(filePath: string): Map<string, string> {
  const vars = new Map<string, string>();
  try {
    const content = readFileSync(filePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const name = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (name) vars.set(name, value);
    }
  } catch {
    // file not found
  }
  return vars;
}

function checkEnvDocs(docPath: string): Map<string, boolean> {
  const documented = new Map<string, boolean>();
  try {
    const content = readFileSync(docPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/`([A-Z_]+)`/);
      if (match) {
        documented.set(match[1], true);
      }
    }
  } catch {
    // file not found
  }
  return documented;
}

async function main(): Promise<void> {
  let exitCode = 0;

  const workspaces = ['apps/api', 'apps/web', 'apps/mobile'];

  for (const ws of workspaces) {
    const wsPath = resolve(ROOT, ws);
    const examplePath = resolve(wsPath, '.env.example');
    const envPath = resolve(wsPath, '.env');

    if (!existsSync(examplePath)) {
      console.warn(`WARN: ${ws} has no .env.example`);
      continue;
    }

    const exampleVars = parseEnvExample(examplePath);
    if (exampleVars.size === 0) {
      console.warn(`WARN: ${ws}/.env.example is empty or unreadable`);
      continue;
    }

    const documented = checkEnvDocs(resolve(ROOT, 'docs/SETUP.md'));

    for (const [name, value] of exampleVars) {
      const issues: string[] = [];

      if (value.includes('change-me') || value === '""' || value === "''") {
        issues.push(`${ws}: ${name} has placeholder value — document required format`);
      }

      if (!documented.has(name)) {
        issues.push(`${ws}: ${name} missing from docs/SETUP.md`);
      }

      for (const [otherName, otherValue] of exampleVars) {
        if (name !== otherName && value === otherValue) {
          issues.push(`${ws}: ${name} shares value with ${otherName} — verify intentional`);
          break;
        }
      }

      for (const issue of issues) {
        console.error(`ISSUE: ${issue}`);
        exitCode = 1;
      }
    }

    // Check if .env exists (should be gitignored)
    if (existsSync(envPath)) {
      console.warn(`NOTE: ${ws}/.env exists locally — ensure it's in .gitignore`);
    }
  }

  process.exit(exitCode);
}

main();
