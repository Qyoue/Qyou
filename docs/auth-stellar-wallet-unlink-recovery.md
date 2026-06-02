# AUTH-091 — Wallet Unlink, Rotation, and Account Recovery Flow

## Overview

This document captures the target flow, boundaries, and failure states for the Stellar wallet unlink, rotation, and recovery lifecycle.

Scope: the Stellar linking surface owned by `@qyou/stellar-service` and the shared contracts in `@qyou/types`.

Backlog-ID: AUTH-091  
Backlog-Slug: auth-091-st-design-the-unlink-rotation-and-account-recovery-flow

## High-level principles

- Treat wallet linkage as identity infrastructure (high-risk, audit-friendly), not a convenience feature.
- Make every mutation explicit: `link`, `unlink`, `rotate`, `initiateRecovery`, `confirmRecovery`.
- Keep recovery tokens short-lived, single-use, and scoped to `(accountId, token)`.
- Keep failure states stable and typed (clients can reason about UX without guessing).

## Service boundary

- `@qyou/types` owns the request/response shapes (DTOs + error codes).
- `@qyou/stellar-service` owns the state machine and the mutation endpoints.
- `@qyou/api` should treat Stellar wallet lifecycle as a downstream dependency (no duplicate state).

## State model

`WalletLinkRecord` (source of truth shape): `packages/types/src/index.ts`

```ts
type WalletLinkRecord = {
  accountId: string;
  walletAddress: string;
  linkedAt: string;
  rotatedAt?: string;
  recoveryToken?: string;
  recoveryExpiresAt?: number;
};
```

### States

- `UNLINKED`: no record exists for `accountId`
- `LINKED`: record exists and `recoveryToken` is unset
- `RECOVERY_IN_PROGRESS`: record exists and `recoveryToken` + `recoveryExpiresAt` are set and not expired

## Endpoints (route contract)

Owned by `apps/stellar-service/src/index.ts`.

### `POST /api/v1/stellar/wallet/unlink`

Request body:
```json
{ "accountId": "acc_..." }
```

Response:
- `200` → `{ "ok": true }`
- `404` → `{ "ok": false, "code": "NOT_LINKED", "message": "..." }`

Security + failure notes:
- Idempotency is acceptable (`NOT_LINKED` can be treated as a no-op by callers).
- When unlinking, clear any in-flight recovery state and emit an audit event with the prior address (server-side).

### `POST /api/v1/stellar/wallet/rotate`

Request body:
```json
{ "accountId": "acc_...", "newWalletAddress": "G..." }
```

Response:
- `200` → `{ "ok": true, "accountId": "...", "walletAddress": "G...", "rotatedAt": "..." }`
- `404` → `{ "ok": false, "code": "NOT_LINKED", "message": "..." }`

Security + failure notes:
- Rotation must be serialized per `accountId` to avoid double-rotation races.
- Rotation should be rejected while `RECOVERY_IN_PROGRESS` (or require completing/canceling recovery first).

### `POST /api/v1/stellar/wallet/recovery/initiate`

Request body:
```json
{ "accountId": "acc_..." }
```

Response:
- `200` → `{ "ok": true, "recoveryToken": "<uuid>", "expiresAt": "<iso>" }`
- `404` → `{ "ok": false, "code": "NOT_LINKED", "message": "..." }`

Security + failure notes:
- Initiation is rate-limited per `accountId` to prevent token-spam.
- Issuing a new token should invalidate any previous token for the same `accountId`.
- Token must be opaque (UUID) and short-lived.

### `POST /api/v1/stellar/wallet/recovery/confirm`

Request body:
```json
{
  "accountId": "acc_...",
  "recoveryToken": "<uuid>",
  "newWalletAddress": "G..."
}
```

Response:
- `200` → `{ "ok": true, "accountId": "...", "walletAddress": "G..." }`
- `401` → `{ "ok": false, "code": "INVALID_RECOVERY_TOKEN", "message": "..." }`

Security + failure notes:
- Confirm must be single-use and atomic (consume token + set new address).
- Confirm must validate `(accountId, token)` binding and expiry.
- Confirm should emit an audit event including prior + new address, and whether recovery replaced an existing link.

## UX recommendations (client-facing)

- Unlink: require explicit confirmation (“This will disconnect rewards.”).
- Rotate: show current address and require re-entry or signature challenge for high assurance.
- Recovery: present as a last resort; clearly communicate expiry and single-use behavior.

## Verification notes

- Start the stellar service and exercise flows with `curl` against the endpoints above.
- Prefer validating behavior via typed results (`WalletUnlinkResult`, `WalletRotateResult`, `WalletRecovery*Result`) rather than relying on log output alone.

