# AUTH-111–116 — Auth Observability, Audit & Abuse Controls

Covers AUTH-111 through AUTH-116.

## Goals

- Make auth flows debuggable in hackathon environments without heavy dependencies.
- Keep events consistent across workspaces (API + Stellar service).
- Block obvious abuse at the auth layer without external services.

---

## 1. Structured logging

All auth modules must emit JSON logs via the shared helper:

```ts
import { createStructuredLogger } from "@qyou/config";

const log = createStructuredLogger({ service: "api", component: "auth.login" });
log("info", "LOGIN_OK", { accountId, latency_ms });
log("warn", "RATE_LIMITED", { ip, operation: "login" });
log("error", "LOGIN_FAIL", { reason: "invalid credentials" });
```

Required fields on every entry: `ts` (ISO-8601), `level`, `event`, `service`.  
Optional but encouraged: `component`, `accountId`, `walletAddress`, `latency_ms`, `reason`, `ip`.

**Common pitfall**: do not define a local `function log(...)` — the audit script flags it as drift.

---

## 2. Abuse controls

The `checkAbuse` helper from `@qyou/config` provides in-process rate limiting:

```ts
import { checkAbuse } from "@qyou/config";

const result = checkAbuse({ operation: "login", ip: req.ip, accountId });
if (!result.allowed) {
  // result.code === "RATE_LIMITED", result.retryAfterMs available
  return res.status(429).json({ error: result.code });
}
```

Default limits (per key, per window):

| Operation         | Max attempts | Window   |
|-------------------|-------------|----------|
| `login`           | 10          | 60 s     |
| `register`        | 5           | 60 s     |
| `password-reset`  | 3           | 5 min    |
| `challenge-verify`| 10          | 60 s     |

Buckets are keyed by `accountId` when available, falling back to `ip`.  
For production, swap the in-memory store with Redis by replacing the internal `buckets` Map.

### Device trust

The `DeviceTrustRecord` type (from `@qyou/types`) defines the contract for
per-device trust state. Persist it alongside the account record and gate
sensitive operations on `trusted: false` with a step-up challenge.

---

## 3. Scripts

### Monitor (AUTH-113)

Surfaces high-signal events and separates warnings from real failures:

```bash
node scripts/auth-observability-monitor.mjs
```

- **Warnings** (exit 0): missing optional env vars with safe defaults.
- **Errors** (exit 1): ad-hoc loggers detected, required env missing in production, build failures.

### Exercise (AUTH-114)

Runs fixture scenarios against the logger and abuse-control baseline:

```bash
npm run build  # types + config must be built first
node scripts/auth-observability-exercise.mjs
```

Scenarios covered: logger shape, error routing, rate-limit enforcement, bucket isolation by operation and account.

### Existing audit script (AUTH-111/112)

```bash
npm run auth:observability
```

Checks for logger drift (ad-hoc `function log(...)`) in auth source files.

---

## 4. Prerequisites and secrets

| Variable                   | Required in prod | Default (dev)                          |
|----------------------------|-----------------|----------------------------------------|
| `JWT_SECRET`               | ✓               | `dev-secret-change-in-production`      |
| `ACCESS_TOKEN_TTL_SECONDS` |                 | `900`                                  |
| `REFRESH_TOKEN_TTL_SECONDS`|                 | `604800`                               |
| `CORS_ORIGIN`              |                 | `http://localhost:3000`                |
| `STELLAR_NETWORK`          |                 | `testnet`                              |
| `STELLAR_HORIZON_URL`      |                 | network default                        |
| `STELLAR_RPC_URL`          |                 | network default                        |

Copy the relevant `.env.example` files and fill in production values.  
Never commit real secrets.

---

## 5. Contributor quick-start

```bash
# 1. Build shared packages
npm run build --workspace @qyou/types
npm run build --workspace @qyou/config

# 2. Run the monitor (warnings are normal in dev)
node scripts/auth-observability-monitor.mjs

# 3. Exercise the baseline
node scripts/auth-observability-exercise.mjs

# 4. Full baseline report
npm run auth:baseline
```

A new contributor should be able to run these four commands on a fresh clone with no extra setup beyond `npm install`.
