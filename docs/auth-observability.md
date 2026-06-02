# AUTH-111/112 — Auth Observability & Audit Baseline

This document defines the baseline conventions for auth observability (logs/audit signals) across workspaces.

Backlog-IDs:
- AUTH-111 (define)
- AUTH-112 (wire)

## Goals

- Make auth flows debuggable in hackathon environments without adding heavy dependencies.
- Keep events consistent across workspaces (API + Stellar service).
- Avoid copy/paste logger implementations drifting over time.

## Baseline: structured JSON logs

All auth-related modules should emit JSON logs with these fields:

- `ts`: ISO-8601 timestamp
- `level`: `info` | `warn` | `error`
- `event`: stable event name (e.g. `LOGIN_OK`, `WALLET_LINK_ERROR`)
- `service`: high-level service name (`api`, `stellar-service`)
- `component`: module name (e.g. `auth.login`)
- plus event-specific fields (`accountId`, `walletAddress`, `latency_ms`, `reason`, etc.)

## Implementation (shared helper)

Use the shared logger helper from `@qyou/config`:

```ts
import { createStructuredLogger } from "@qyou/config";

const log = createStructuredLogger({ service: "api", component: "auth.login" });
log("info", "LOGIN_OK", { accountId, latency_ms });
```

This keeps the log shape consistent and prevents logger drift across workspaces.

## Monitoring

Run:

```bash
npm run auth:observability
```

This checks for common drift signals (e.g., ad-hoc `function log(...)` definitions) and ensures the affected workspaces build/typecheck.

