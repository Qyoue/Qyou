/**
 * AUTH-113 — Auth observability monitor
 *
 * Surfaces high-signal operational events across auth workspaces.
 * Separates expected warnings (missing optional env, dev defaults) from real
 * failures (missing required config, ad-hoc loggers, build errors).
 *
 * Usage:
 *   node scripts/auth-observability-monitor.mjs
 *
 * Exit code: 0 = no errors (warnings are allowed), 1 = one or more errors.
 */

import { execSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const IGNORE = new Set(["node_modules", ".git", "dist", ".next", "build", "coverage"]);

const AUTH_DIRS = [
  path.join(ROOT, "apps", "api", "src", "auth"),
  path.join(ROOT, "apps", "stellar-service", "src"),
];

async function walk(dir) {
  let files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files; // dir doesn't exist yet — not an error
  }
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await walk(full)));
    else if (e.isFile() && e.name.endsWith(".ts")) files.push(full);
  }
  return files;
}

function run(cmd) {
  try {
    execSync(cmd, { stdio: "pipe" });
    return null;
  } catch (err) {
    return err.stderr?.toString() || err.stdout?.toString() || String(err);
  }
}

const warnings = [];
const errors = [];

// --- 1. Logger drift check ---
for (const dir of AUTH_DIRS) {
  for (const file of await walk(dir)) {
    const rel = path.relative(ROOT, file);
    const text = await readFile(file, "utf8");
    if (text.includes("function log(") && !text.includes("createStructuredLogger")) {
      errors.push(`${rel}: ad-hoc logger (use createStructuredLogger from @qyou/config)`);
    }
  }
}

// --- 2. Env baseline warnings (expected in dev, real failures in prod) ---
const requiredInProd = ["JWT_SECRET"];
const optional = [
  "ACCESS_TOKEN_TTL_SECONDS",
  "REFRESH_TOKEN_TTL_SECONDS",
  "CORS_ORIGIN",
  "STELLAR_NETWORK",
  "STELLAR_HORIZON_URL",
  "STELLAR_RPC_URL",
];

const nodeEnv = process.env.NODE_ENV ?? "development";
for (const key of requiredInProd) {
  if (!process.env[key]) {
    if (nodeEnv === "production") errors.push(`${key} is not set (required in production)`);
    else warnings.push(`${key} is not set — using dev default`);
  }
}
for (const key of optional) {
  if (!process.env[key]) warnings.push(`${key} is not set — using default`);
}

// --- 3. Build health check for auth workspaces ---
const buildError = run("npm run build --workspace @qyou/config --workspace @qyou/types 2>&1");
if (buildError) errors.push(`build failed:\n${buildError}`);

// --- Output ---
console.log("=== Auth observability monitor ===");
console.log(`env: ${nodeEnv}`);

if (warnings.length) {
  console.log("\nWarnings (expected in dev):");
  for (const w of warnings) console.log(`  ⚠  ${w}`);
}

if (errors.length) {
  console.log("\nErrors (need attention):");
  for (const e of errors) console.log(`  ✗  ${e}`);
  process.exitCode = 1;
} else {
  console.log("\n✓ No errors detected.");
}
