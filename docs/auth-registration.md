# AUTH-001 — Account Registration: Design

## Flow

```
Client                          API
  │                              │
  │  POST /api/v1/auth/register  │
  │  { email, password,          │
  │    displayName? }            │
  │─────────────────────────────>│
  │                              │ validate input
  │                              │ check rate-limit (per IP)
  │                              │ check duplicate email
  │                              │ hash password
  │                              │ persist AccountRecord
  │                              │ emit REGISTER_OK log
  │  201 { ok, accountId,        │
  │        email, status }       │
  │<─────────────────────────────│
```

## Route Contract

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/register` |
| **Auth** | None |

### Request body

```json
{
  "email": "user@example.com",
  "password": "s3cr3tpass",
  "displayName": "Alice"
}
```

`displayName` is optional; defaults to the local part of the email.

### Success — 201

```json
{ "ok": true, "accountId": "<uuid>", "email": "user@example.com", "status": "pending_verification" }
```

### Failure responses

| HTTP | `code` | Trigger |
|------|--------|---------|
| 400 | `VALIDATION_ERROR` | Missing/invalid email or short password |
| 409 | `DUPLICATE_EMAIL` | Email already registered |
| 429 | `RATE_LIMITED` | >5 attempts per IP per minute |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

## Data Shape

```ts
type AccountRecord = {
  id: string;               // UUID v4
  email: string;            // normalised (lowercase, trimmed)
  passwordHash: string;     // SHA-256 for MVP; replace with bcrypt/argon2
  displayName: string;
  createdAt: string;        // ISO 8601
  status: "pending_verification" | "active";
};
```

## Boundaries & Tradeoffs

- **Store**: in-memory `Map` keyed by normalised email. Swap for a DB adapter (Postgres/Prisma) without touching the service interface.
- **Password hashing**: SHA-256 with a static prefix for MVP speed. Must be replaced with bcrypt/argon2 before any real user data is stored.
- **Rate-limit**: per-IP sliding window in memory. Replace with Redis for multi-instance deployments.
- **Session**: no JWT issued here — that is a follow-on slice (`AUTH-005`).
- **Email verification**: `status` starts as `pending_verification`; the verification flow is a follow-on slice.

## Failure States

| State | Handling |
|-------|----------|
| Invalid input | Synchronous validation, 400 returned before any store access |
| Duplicate email | Checked after validation, 409 returned |
| Rate exceeded | Checked after validation, 429 returned |
| Store write failure | Caught, logged as `REGISTER_ERROR`, 500 returned |

## Audit Signals (AUTH-004)

Every attempt emits a structured JSON log line to stdout:

| Event | Level | When |
|-------|-------|------|
| `REGISTER_ATTEMPT` | info | Request received |
| `REGISTER_INVALID` | warn | Validation failed |
| `REGISTER_RATE_LIMITED` | warn | IP throttled |
| `REGISTER_DUPLICATE` | warn | Email already exists |
| `REGISTER_OK` | info | Account created |
| `REGISTER_ERROR` | error | Unexpected failure |
