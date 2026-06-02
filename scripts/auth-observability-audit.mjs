import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", ".next", "build", "coverage"]);

const TARGET_DIRS = [
  path.join(ROOT, "apps", "api", "src", "auth"),
  path.join(ROOT, "apps", "stellar-service", "src"),
];

function print(title, lines) {
  if (lines.length === 0) return;
  // eslint-disable-next-line no-console
  console.log(`\n${title}`);
  for (const line of lines) {
    // eslint-disable-next-line no-console
    console.log(`- ${line}`);
  }
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      files.push(...(await walk(fullPath)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name.endsWith(".ts")) files.push(fullPath);
  }
  return files;
}

async function main() {
  const warnings = [];
  const errors = [];

  let checkedFiles = 0;
  for (const dir of TARGET_DIRS) {
    const files = await walk(dir);
    for (const file of files) {
      checkedFiles += 1;
      const rel = path.relative(ROOT, file);
      const text = await readFile(file, "utf8");

      if (text.includes("function log(") && !text.includes("createStructuredLogger")) {
        errors.push(`${rel}: ad-hoc logger detected (prefer @qyou/config createStructuredLogger).`);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log("Auth observability audit");
  // eslint-disable-next-line no-console
  console.log(`checked_files: ${checkedFiles}`);

  print("Warnings", warnings);
  print("Errors", errors);

  if (errors.length > 0) process.exitCode = 1;
}

await main();

