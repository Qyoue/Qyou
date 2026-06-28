import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface HardenIssue {
  workspace: string;
  severity: 'error' | 'warn';
  message: string;
}

const PLACEHOLDER_PATTERNS = ['change-me', 'your-', 'CHANGE_ME', '<your', 'TODO', 'changeme', 'placeholder', 'secret'];

function parseEnv(path: string): Record<string, string> {
  const vars: Record<string, string> = {};
  if (!existsSync(path)) return vars;
  const content = readFileSync(path, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const eqIdx = trimmed.indexOf('=');
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key) vars[key] = val;
  }
  return vars;
}

const SECRET_INDICATORS = ['secret', 'password', 'token', 'key', 'auth', 'private', 'jwt', 'database_url'];

function checkEnvFile(workspacePath: string, workspaceName: string): HardenIssue[] {
  const issues: HardenIssue[] = [];
  const envPath = resolve(workspacePath, '.env');
  const examplePath = resolve(workspacePath, '.env.example');

  if (!existsSync(examplePath)) {
    issues.push({ workspace: workspaceName, severity: 'error', message: '.env.example not found' });
    return issues;
  }

  const exampleVars = parseEnv(examplePath);

  for (const [key, val] of Object.entries(exampleVars)) {
    if (!val) {
      issues.push({ workspace: workspaceName, severity: 'warn', message: `"${key}" has no default value in .env.example` });
    }

    const isSecret = SECRET_INDICATORS.some((s) => key.toLowerCase().includes(s));
    if (isSecret && PLACEHOLDER_PATTERNS.some((p) => val.toLowerCase().includes(p))) {
      issues.push({ workspace: workspaceName, severity: 'warn', message: `"${key}" uses a placeholder value: "${val}"` });
    }

    if (isSecret && val && val.length < 12) {
      issues.push({ workspace: workspaceName, severity: 'warn', message: `"${key}" in .env.example is short (${val.length} chars, min 12)` });
    }
  }

  if (existsSync(envPath)) {
    const envVars = parseEnv(envPath);
    for (const [key, val] of Object.entries(envVars)) {
      const isSecret = SECRET_INDICATORS.some((s) => key.toLowerCase().includes(s));
      if (isSecret && val.length < 12) {
        issues.push({ workspace: workspaceName, severity: 'error', message: `"${key}" in .env is too short (${val.length} chars, min 12)` });
      }
      if (isSecret && PLACEHOLDER_PATTERNS.some((p) => val.toLowerCase().includes(p))) {
        issues.push({ workspace: workspaceName, severity: 'warn', message: `"${key}" in .env contains a placeholder value` });
      }
    }
  }

  return issues;
}

function main(): void {
  const root = resolve(import.meta.dirname, '..');
  let exitCode = 0;

  const envDirs: [string, string][] = [
    [resolve(root, 'apps/api'), '@qyou/api'],
    [resolve(root, 'apps/web'), '@qyou/web'],
    [resolve(root, 'apps/mobile'), '@qyou/mobile'],
  ];

  for (const [dir, name] of envDirs) {
    const issues = checkEnvFile(dir, name);
    for (const issue of issues) {
      const prefix = issue.severity === 'error' ? 'ERROR' : 'WARN';
      console.error(`[${prefix}] ${issue.workspace} — ${issue.message}`);
      if (issue.severity === 'error') exitCode = 1;
    }
  }

  process.exit(exitCode);
}

if (process.argv[1]?.endsWith('env-secret-hardening-phase3.ts')) main();
