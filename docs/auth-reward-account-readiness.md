# AUTH-096 — Reward-Account Readiness Checks: Design

## Summary

This document describes the design for the reward-account readiness check flow in the Stellar service. The goal is to expose a lightweight, synchronous check that tells callers whether a given account is ready to receive Stellar-backed rewards.

## Why This Matters

The auth milestone must leave the repo ready for later reward and payout milestones without another reset. Reward readiness is a gate: downstream services (queue payouts, admin dashboards) need a single, reliable signal before attempting any disbursement.

## Target Flow

```
Caller                  stellar-service
  |                           |
  |-- GET /api/v1/stellar/wallet/readiness?accountId=X -->|
  |                           |
  |                    checkRewardReadiness(accountId)
  |                           |
  |                    [validate accountId]
  |                    [lookup walletStore]
  |                    [evaluate readiness criteria]
  |                           |
  |<-- 200 { ready, accountId, walletAddress?, reason? } --|
```

## Readiness Criteria

An account is **ready** (`ready: true`) when:

1. A wallet address is linked (`walletStore` has an entry for the `accountId`).
2. The linked wallet address passes Stellar address validation (56-char `G…` format).
3. No active recovery is in progress (no unexpired `recoveryToken` on the record).

An account is **not ready** (`ready: false`) with a `reason` code when any criterion fails:

| Reason code          | Meaning                                                  |
|----------------------|----------------------------------------------------------|
| `NO_WALLET_LINKED`   | No wallet address is associated with this account.       |
| `INVALID_ADDRESS`    | The stored address fails Stellar format validation.      |
| `RECOVERY_IN_PROGRESS` | An active recovery token exists; address may change.  |

## Interface / Data Shape

### Request

```
GET /api/v1/stellar/wallet/readiness?accountId={accountId}
```

### Response — ready

```json
{
  "ready": true,
  "accountId": "acct-123",
  "walletAddress": "GBVVJJWAKWYMKWMQHWOMTEKOVUA36TYVWRECQ7YGPMXWYE5VWHUWMXNB"
}
```

### Response — not ready

```json
{
  "ready": false,
  "accountId": "acct-123",
  "reason": "NO_WALLET_LINKED"
}
```

### HTTP Status Codes

| Condition                  | Status |
|----------------------------|--------|
| Ready or not-ready result  | 200    |
| Missing / blank accountId  | 400    |
| Internal error             | 500    |

### TypeScript Types (added to `@qyou/types`)

```ts
export type RewardReadinessResult =
  | { ready: true;  accountId: string; walletAddress: string }
  | { ready: false; accountId: string; reason: RewardReadinessReason };

export type RewardReadinessReason =
  | "NO_WALLET_LINKED"
  | "INVALID_ADDRESS"
  | "RECOVERY_IN_PROGRESS";
```

## Failure States and Edge Cases

- **Missing accountId**: return HTTP 400 before touching the store.
- **Account exists but address is malformed**: should not happen in normal operation (link/rotate validate the address), but the check defends against direct store manipulation.
- **Recovery in progress**: the address is about to change; callers should wait and retry.
- **Store eviction race**: if the record disappears between the size check and the lookup, treat as `NO_WALLET_LINKED`.

## Implementation Boundaries

- `checkRewardReadiness(accountId)` lives in `wallet-link.ts` alongside the other wallet operations.
- The HTTP route lives in `index.ts` as a `GET` (read-only, idempotent).
- No external Stellar network call is made; this is a local state check only.
- The function is pure with respect to the in-memory store — it does not mutate state.

## Tradeoffs

- **In-memory only**: readiness reflects the local service state. A multi-instance deployment would need a shared store. Acceptable for the auth milestone; flagged for the payout milestone.
- **No on-chain verification**: checking whether the Stellar account actually exists on-chain is deferred to the payout milestone to avoid network latency in the auth path.
- **Synchronous GET**: keeps the contract simple and cacheable by upstream services.

## Follow-on Work (Payout Milestone)

- Add on-chain account existence check via Horizon API.
- Add minimum XLM balance check (account must be funded to receive assets).
- Expose readiness as a webhook event when status changes.
