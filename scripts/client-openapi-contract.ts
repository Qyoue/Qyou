/**
 * Compares the API paths the web and mobile clients call with apps/api/openapi.json (#1384).
 *
 * A path a client calls must either be documented in the spec or be listed in
 * KNOWN_DRIFT with a reason. An entry that is no longer needed (the path is now
 * in the spec, or no client calls it) is reported as stale so the list shrinks.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Client-called paths that the spec does not document yet. */
export const KNOWN_DRIFT: Record<string, string> = {
  '/api/auth/login': 'auth endpoints are not in openapi.json yet',
  '/api/auth/register': 'auth endpoints are not in openapi.json yet',
  '/api/auth/refresh': 'legacy /api alias of the documented /auth/refresh route (#1263)',
  '/api/auth/session/validate': 'TODO(#831): endpoint does not exist on the API yet',
};

const CLIENT_DIRS = ['apps/web/src', 'apps/mobile/src'];
const SOURCE = /\.(ts|tsx)$/;
const IGNORED = /(__tests__|\.test\.|node_modules)/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (IGNORED.test(path)) return [];
    return statSync(path).isDirectory() ? walk(path) : SOURCE.test(path) ? [path] : [];
  });
}

/** String literals that start with `/api/`. Template parts after `${` are cut off. */
export function extractApiPaths(source: string): string[] {
  const found = new Set<string>();
  for (const match of source.matchAll(/['"`](\/api\/[A-Za-z0-9_\-/{}.]*)/g)) {
    const path = match[1]!.replace(/\/+$/, '');
    if (path.length > '/api/'.length) found.add(path);
  }
  return [...found];
}

export function clientPaths(root = ROOT): Map<string, string[]> {
  const byPath = new Map<string, string[]>();
  for (const dir of CLIENT_DIRS) {
    let files: string[] = [];
    try {
      files = walk(join(root, dir));
    } catch {
      continue;
    }
    for (const file of files) {
      for (const path of extractApiPaths(readFileSync(file, 'utf8'))) {
        byPath.set(path, [...(byPath.get(path) ?? []), file.slice(root.length + 1)]);
      }
    }
  }
  return byPath;
}

export function specPaths(root = ROOT): Set<string> {
  const spec = JSON.parse(readFileSync(join(root, 'apps/api/openapi.json'), 'utf8')) as {
    paths: Record<string, unknown>;
  };
  return new Set(Object.keys(spec.paths));
}

/** A client path is documented if it equals a spec path or is a prefix of one (base URLs such as `/api/stellar`). */
export function isDocumented(path: string, spec: Set<string>): boolean {
  for (const s of spec) if (s === path || s.startsWith(`${path}/`)) return true;
  return false;
}

export function findDrift(root = ROOT) {
  const spec = specPaths(root);
  const clients = clientPaths(root);
  const undocumented = [...clients.keys()].filter(
    (p) => !isDocumented(p, spec) && !(p in KNOWN_DRIFT),
  );
  const stale = Object.keys(KNOWN_DRIFT).filter((p) => !clients.has(p) || isDocumented(p, spec));
  return { undocumented, stale, clients };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { undocumented, stale } = findDrift();
  for (const p of undocumented) console.error(`client calls ${p}, which openapi.json does not document`);
  for (const p of stale) console.error(`KNOWN_DRIFT entry ${p} is stale; remove it`);
  process.exit(undocumented.length || stale.length ? 1 : 0);
}
