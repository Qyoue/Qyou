import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { contracts, validateEnvFile, type EnvContract } from './env-contract.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function parseEnvFile(filePath: string): Record<string, string> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const vars: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const name = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim().replace(/^"(.*)"$/, '$1');
      if (name) vars[name] = value;
    }
    return vars;
  } catch {
    return {};
  }
}

function main(): void {
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const contract of contracts) {
    const examplePath = resolve(ROOT, `${contract.app}/.env.example`);
    const exampleVars = parseEnvFile(examplePath);
    const result = validateEnvFile(exampleVars, contract as EnvContract<unknown>);

    for (const err of result.errors) {
      console.error(`ERROR: ${err}`);
      totalErrors++;
    }
    for (const warn of result.warnings) {
      console.warn(`WARN: ${warn}`);
      totalWarnings++;
    }
  }

  console.log(`\n${totalErrors} error(s), ${totalWarnings} warning(s)`);
  process.exit(totalErrors > 0 ? 1 : 0);
}

main();
