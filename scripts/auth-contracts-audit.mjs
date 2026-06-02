import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", ".next", "build", "coverage"]);

const CONTRACT_MARKERS = [
  "export type RegistrationInput",
  "export type RegistrationResult",
  "export type LoginInput",
  "export type LoginResult",
  "export type RefreshInput",
  "export type RefreshResult",
  "export type LogoutInput",
  "export type LogoutResult",
  "export type VerificationInput",
  "export type VerificationResult",
  "export type PasswordResetRequestInput",
  "export type PasswordResetRequestResult",
  "export type PasswordResetConfirmInput",
  "export type PasswordResetConfirmResult",
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
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

function isInTypesPackage(filePath) {
  const rel = path.relative(ROOT, filePath);
  return rel.startsWith(path.join("packages", "types", "src") + path.sep);
}

async function main() {
  const warnings = [];
  const errors = [];

  const files = await walk(ROOT);
  for (const filePath of files) {
    if (isInTypesPackage(filePath)) continue;
    const rel = path.relative(ROOT, filePath);
    const text = await readFile(filePath, "utf8");

    for (const marker of CONTRACT_MARKERS) {
      if (text.includes(marker)) {
        errors.push(`${rel}: duplicates contract marker (${marker}) — use @qyou/types instead.`);
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log("Auth contracts audit");
  // eslint-disable-next-line no-console
  console.log(`checked_files: ${files.length}`);

  print("Warnings", warnings);
  print("Errors", errors);

  if (errors.length > 0) process.exitCode = 1;
}

await main();

