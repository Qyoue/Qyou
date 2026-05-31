# AUTH-011 — Refresh, Logout, and Session-Rotation Flow

## Overview

This document describes the design for long-lived session management in the Qyou API. It covers token refresh, logout, and session rotation — the three operations that turn a demo auth flow into an MVP-grade system.

## Token Strategy

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access token | 15 min | Client memory | Authenticate API requests |
| Refresh token | 7 days | In-memory Map (swap for DB) | Issue new access tokens |

Access tokens are short-lived JWTs (HMAC-SHA256, no external dep). Refresh tokens are opaque UUIDs stored server-side, which means they can be revoked instantly.

## Endpoints

### `POST /api/v1/auth/refresh`

Exchange a valid refresh token for a new access token and a rotated refresh token.

**Request body**
```json
{ "refreshToken": "<uuid>" }
```

**Success — 200**
```json
{
  "ok": true,
  "tokens": {
    "accessToken": "<jwt>",
    "expiresAt": "<iso8601>",
    "refreshToken": "<new-uuid>"
  }
}
```

**Failure codes**

| HTTP | code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or blank refreshToken |
| 401 | `INVALID_REFRESH_TOKEN` | Token not found or expired |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

**Session rotation**: the old refresh token is deleted and a new one is issued atomically. A replayed token returns `INVALID_REFRESH_TOKEN`.

---

### `POST /api/v1/auth/logout`

Revoke a refresh token immediately.

**Request body**
```json
{ "refreshToken": "<uuid>" }
```

**Success — 200**
```json
{ "ok": true }
```

**Failure codes**

| HTTP | code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or blank refreshToken |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

Logout is idempotent: revoking an already-revoked or unknown token still returns `ok: true`. This prevents token-existence probing.

---

## Data Shape

```typescript
// Stored per refresh token
type RefreshEntry = {
  accountId: string;
  expiresAt: number; // Unix ms
};

// refreshStore: Map<refreshToken, RefreshEntry>
```

The `refreshStore` lives in `login.ts` and is already exported for tests. The refresh and logout service functions import it directly.

## Failure States

| Scenario | Behaviour |
|----------|-----------|
| Expired refresh token | Deleted on first use attempt; returns `INVALID_REFRESH_TOKEN` |
| Unknown refresh token | Returns `INVALID_REFRESH_TOKEN` (same response as expired — no probing) |
| Replayed rotated token | Returns `INVALID_REFRESH_TOKEN` |
| Logout with unknown token | Returns `ok: true` (idempotent) |
| Concurrent refresh race | Last writer wins; first caller gets new tokens, second gets `INVALID_REFRESH_TOKEN` |

## Service Boundaries

- `apps/api/src/auth/session.ts` — `refresh()` and `logout()` pure service functions
- `apps/api/src/index.ts` — route handlers wiring service to HTTP
- `packages/types/src/index.ts` — `RefreshResult`, `LogoutResult`, `SessionErrorCode` types
- `refreshStore` (in `login.ts`) — shared in-memory store; swap for a DB adapter when persistence is needed

## Persistence Seam

The `refreshStore` Map is the only persistence surface. To add DB-backed sessions:
1. Replace `refreshStore.set/get/delete` calls in `session.ts` with async DB calls.
2. Add an expiry index or TTL to clean up stale tokens.
3. No changes needed to route handlers or types.

## Verification

```bash
# Run all auth tests
cd apps/api
node --import tsx/esm --test src/auth/registration.test.ts src/auth/login.test.ts src/auth/session.test.ts
```

See `src/auth/session.test.ts` for full coverage of happy path, rotation, expiry, and idempotent logout.
