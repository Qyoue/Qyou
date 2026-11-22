import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const specModule = await import(pathToFileURL(path.join(root, 'src/openapi-spec.ts')).href);
const out = path.join(root, 'openapi.json');
fs.writeFileSync(out, JSON.stringify(specModule.openApiSpec, null, 2) + '\n');
console.log(`Wrote ${out}`);
