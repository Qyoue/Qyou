/**
 * AUTH-114 — Auth observability exercise
 *
 * Runs realistic local scenarios against the observability and abuse-control
 * baseline to catch drift or missing configuration early.
 *
 * Usage:
 *   node scripts/auth-observability-exercise.mjs
 *
 * Prerequisites: npm run build (types + config built)
 * Exit code: 0 = all scenarios passed, 1 = one or more failed.
 */

// Dynamic import so this works before a full monorepo install.
const { createStructuredLogger, checkAbuse, resetAbuseBuckets } = await import(
  "../packages/config/dist/index.js"
);

let passed = 0;
let failed = 0;

function scenario(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// --- Logger shape ---
console.log("\n[Scenario group] Structured logger");

scenario("emits valid JSON to stdout", () => {
  const lines = [];
  const orig = console.log;
  console.log = (v) => lines.push(v);
  const log = createStructuredLogger({ service: "api", component: "auth.login" });
  log("info", "LOGIN_OK", { accountId: "acc_test" });
  console.log = orig;

  assert(lines.length === 1, "expected one log line");
  const entry = JSON.parse(lines[0]);
  assert(entry.ts, "missing ts");
  assert(entry.level === "info", "wrong level");
  assert(entry.event === "LOGIN_OK", "wrong event");
  assert(entry.service === "api", "wrong service");
  assert(entry.component === "auth.login", "wrong component");
  assert(entry.accountId === "acc_test", "missing extra field");
});

scenario("error level goes to console.error", () => {
  const lines = [];
  const orig = console.error;
  console.error = (v) => lines.push(v);
  const log = createStructuredLogger({ service: "api" });
  log("error", "LOGIN_FAIL");
  console.error = orig;
  assert(lines.length === 1, "expected one error line");
  const entry = JSON.parse(lines[0]);
  assert(entry.level === "error", "wrong level");
});

// --- Abuse control ---
console.log("\n[Scenario group] Abuse controls");

scenario("allows requests within rate limit", () => {
  resetAbuseBuckets();
  const result = checkAbuse({ operation: "login", ip: "1.2.3.4" });
  assert(result.allowed === true, "expected allowed");
});

scenario("blocks after exceeding login limit (10 attempts)", () => {
  resetAbuseBuckets();
  let last;
  for (let i = 0; i < 12; i++) {
    last = checkAbuse({ operation: "login", ip: "5.5.5.5" });
  }
  assert(last.allowed === false, "expected blocked after 12 attempts");
  assert(last.code === "RATE_LIMITED", `expected RATE_LIMITED, got ${last.code}`);
  assert(typeof last.retryAfterMs === "number", "expected retryAfterMs");
});

scenario("buckets are isolated per operation", () => {
  resetAbuseBuckets();
  // exhaust login bucket
  for (let i = 0; i < 12; i++) checkAbuse({ operation: "login", ip: "9.9.9.9" });
  // register bucket for same IP should still be open
  const result = checkAbuse({ operation: "register", ip: "9.9.9.9" });
  assert(result.allowed === true, "register bucket should be independent of login bucket");
});

scenario("buckets are isolated per account", () => {
  resetAbuseBuckets();
  for (let i = 0; i < 12; i++) checkAbuse({ operation: "login", accountId: "acc_a" });
  const result = checkAbuse({ operation: "login", accountId: "acc_b" });
  assert(result.allowed === true, "acc_b should not be affected by acc_a's bucket");
});

// --- Summary ---
console.log(`\n${passed + failed} scenarios — ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
