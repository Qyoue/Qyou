# AUTH-086..090 — Wallet-Link Completion & Account Binding (Design, Implementation, Hardening, Verification)

This document describes the wallet-link completion and account binding flow implemented in `@qyou/stellar-service`, with verification notes for contributors.

Backlog-IDs:
- AUTH-086 (Design)
- AUTH-087 (Implement)
- AUTH-088 (Harden)
- AUTH-090 (Verify)

## Scope

- Service: `apps/stellar-service`
- Contracts: `packages/types` (`WalletLink*` DTOs, error codes)
- Non-goals: persistence/DB adapters (current stores are in-memory by design)

## Why this exists

The completion flow ensures we never end up in a partially-bound state where:
- an account appears linked but cannot reliably receive rewards, or
- a stale recovery token can mutate identity after a safe rotation.

## State model

Primary record: `WalletLinkRecord` keyed by `accountId`.

States:
- `UNLINKED`: no record for account
- `LINKED`: record exists
- `RECOVERY_IN_PROGRESS`: record exists + recovery token is active (bounded TTL)

## Core flows

### 1) Link (bind wallet)

Call: `link({ accountId, walletAddress })`

Guarantees:
- cannot overwrite an existing link (`ALREADY_LINKED`)
- records `linkedAt` (audit-friendly)
- rate-limited per `accountId`

### 2) Rotate (change wallet)

Call: `rotate({ accountId, newWalletAddress })`

Guarantees:
- atomic update to the wallet address
- concurrent rotate requests are prevented per `accountId`
- invalidates any outstanding recovery tokens for the account (hardening)

### 3) Recovery (regain control)

Calls:
- `initiateRecovery({ accountId })` → issues a short-lived opaque token
- `confirmRecovery({ accountId, recoveryToken, newWalletAddress })` → consumes token and writes the new address

Guarantees:
- tokens are single-use, time-boxed, and account-bound
- confirm consumes the token even when the account mismatch / expiry logic triggers

### 4) Readiness check

Call: `checkRewardReadiness(accountId)`

Guarantees:
- returns `RECOVERY_IN_PROGRESS` while a valid recovery token is active to prevent payout ambiguity

## Verification (tests)

Run the Stellar service tests:

```bash
npm test --workspace @qyou/stellar-service
```

Key coverage:
- `apps/stellar-service/src/wallet-link-completion.test.ts` — completion lifecycle + partial binding prevention
- `apps/stellar-service/src/wallet-link.test.ts` — guardrails, rate limits, audit trail, recovery behavior

