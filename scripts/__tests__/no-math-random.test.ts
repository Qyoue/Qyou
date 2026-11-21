import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIRS = ['apps/api/src', 'apps/web/src', 'apps/mobile/src', 'packages/stellar/src', 'packages/shared/src'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (/node_modules|dist/.test(path)) return [];
    return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(path) ? [path] : [];
  });
}

describe('no Math.random in package code (#1358)', () => {
  it('only the documented jitter call remains', () => {
    const offenders: string[] = [];
    for (const dir of DIRS) {
      for (const file of walk(join(ROOT, dir))) {
        if (/\.test\.|__tests__/.test(file)) continue;
        const lines = readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (/Math\.random\(/.test(line) && !/eslint-disable-next-line no-restricted-properties/.test(lines[i - 1] ?? '')) {
            offenders.push(`${file.slice(ROOT.length + 1)}:${i + 1}`);
          }
        });
      }
    }
    assert.deepEqual(offenders, [], `Math.random found: ${offenders.join(', ')}`);
  });
});
