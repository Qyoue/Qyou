import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe('scripts inventory (#1386)', () => {
  const readme = readFileSync(join(SCRIPTS, 'README.md'), 'utf8');
  const files = readdirSync(SCRIPTS).filter((f) => /\.(ts|sh)$/.test(f));

  it('lists every script in scripts/README.md', () => {
    const missing = files.filter((f) => !readme.includes(`\`${f}\``));
    assert.deepEqual(missing, [], `add to scripts/README.md: ${missing.join(', ')}`);
  });

  it('does not list scripts that no longer exist', () => {
    const listed = [...readme.matchAll(/`([\w.-]+\.(?:ts|sh))`/g)].map((m) => m[1]!);
    const gone = listed.filter((f) => !files.includes(f));
    assert.deepEqual(gone, [], `remove from scripts/README.md: ${gone.join(', ')}`);
  });
});
