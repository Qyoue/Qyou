# AUTH-016 — Password Reset and Recovery Workflow

## Overview

This document describes the design for the password reset and recovery flow in the Qyou API. It covers the full lifecycle from reset request through token validation to password update, with explicit failure states and service boundaries.

## Flow

```
1. POST /api/v1/auth/password-reset/request
   → validate email
   → look up account (always respond ok:true to prevent email enumeration)
   → generate opaque reset token (UUID), store with accountId + expiresAt (15 min)
   → emit RESET_REQUESTED log event (accountId, tokenPrefix)
   → [future] send email with reset link containing token

2. POST /api/v1/auth/password-reset/confirm
   → validate token + newPassword
   → look up token in resetStore
   → reject if expired or not found
   → hash new password, update account record
   → delete reset token (single-use)
   → invalidate all active refresh tokens for the account (force re-login)
   → emit RESET_CONFIRMED log event (accountId, latency_ms)
```

## Endpoints

### `POST /api/v1/auth/password-reset/request`

**Request body**
```json
{ "email": "user@example.com" }
```

**Response — always 200** (prevents email enumeration)
```json
{ "ok": true }
```

**Failure codes** (only for malformed input)

| HTTP | code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing or invalid email format |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

### `POST /api/v1/auth/password-reset/confirm`

**Request body**
```json
{
  "token": "<uuid>",
  "newPassword": "<min 8 chars>"
}
```

**Success — 200**
```json
{ "ok": true }
```

**Failure codes**

| HTTP | code | Condition |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Missing token or invalid newPassword |
| 401 | `INVALID_RESET_TOKEN` | Token not found or expired |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

---

## Data Shape

```typescript
type ResetEntry = {
  accountId: string;
  expiresAt: number; // Unix ms — 15 min from issuance
};

// resetStore: Map<resetToken, ResetEntry>
// Bounded to RESET_STORE_MAX_SIZE (1 000) with oldest-entry eviction.
```

## Failure States

| Scenario | Behaviour |
|----------|-----------|
| Unknown email in request | Returns `ok: true` (no enumeration) |
| Expired reset token | Deleted on first use; returns `INVALID_RESET_TOKEN` |
| Unknown reset token | Returns `INVALID_RESET_TOKEN` |
| Token replayed after use | Returns `INVALID_RESET_TOKEN` (single-use) |
| Weak new password | Returns `VALIDATION_ERROR` before touching the store |
| Confirm succeeds | All refresh tokens for the account are revoked |

## Service Boundaries

| File | Responsibility |
|------|---------------|
| `apps/api/src/auth/password-reset.ts` | `requestReset()` and `confirmReset()` pure service functions |
| `apps/api/src/index.ts` | Route handlers wiring service to HTTP |
| `packages/types/src/index.ts` | `PasswordResetRequestResult`, `PasswordResetConfirmResult`, `PasswordResetErrorCode` types |
| `resetStore` (in `password-reset.ts`) | In-memory Map; swap for a DB adapter with TTL index when persistence is needed |

## Persistence Seam

`resetStore` is the only persistence surface for reset tokens. To add DB-backed reset:
1. Replace `resetStore.set/get/delete` with async DB calls.
2. Add a TTL index or scheduled cleanup for expired tokens.
3. Account password update becomes a DB write instead of an in-memory Map mutation.

## Rate Limiting

- `requestReset` is rate-limited per IP (5 requests / 60 s) to prevent token-flooding attacks.
- `confirmReset` is rate-limited per token (3 attempts / 60 s) to slow brute-force guessing.

## Verification

```bash
# Run all auth tests (once password-reset.test.ts is added)
cd apps/api
node --import tsx/esm --test src/auth/registration.test.ts src/auth/login.test.ts src/auth/session.test.ts src/auth/password-reset.test.ts
```

## Implementation Notes

- Reset tokens are opaque UUIDs (same pattern as refresh tokens).
- Password hashing uses the same `hashPassword()` helper from `registration.ts`.
- Refresh-token revocation on confirm reuses `refreshStore` from `login.ts` — iterate and delete all entries matching `accountId`.
- Email delivery is out of scope for this slice; the service emits a `RESET_REQUESTED` log event with the token so contributors can wire any transport (SMTP, SendGrid, etc.) without changing the service layer.
# Web Password Reset Experience (AUTH-036)

## Target Flow
1. User selects `Forgot password?` from the web login page.
2. User submits account email (request-reset endpoint).
3. System sends single-use tokenized reset link.
4. User opens link and submits new password.
5. Backend validates token, password policy, and token freshness.
6. Success returns login prompt; failure returns non-enumerating error.

## Boundaries
- Web login page only exposes flow states and guidance.
- Token generation, verification, and invalidation remain API-owned.
- Web should never reveal whether an email exists.

## Failure States
- Invalid/unknown email request.
- Expired token.
- Replayed token.
- Weak password.
- Network/API outage.

## Route/Data Contract
- `POST /api/v1/auth/password-reset/request` body: `{ email: string }`
- `POST /api/v1/auth/password-reset/confirm` body: `{ token: string, password: string }`
- Standard response shape:
  - success: `{ ok: true }`
  - error: `{ ok: false, code: string, message: string }`

## Verification Notes
- From `/login`, toggle password reset section and verify all flow/failure states are visible.
- Confirm login logger emits checkpoints (`LOGIN_ATTEMPT`, `LOGIN_INVALID`, `LOGIN_OK`, `LOGIN_ERROR`).
