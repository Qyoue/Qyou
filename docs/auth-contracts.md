# AUTH-106..108 — Shared Auth Types & Request Contracts

This document defines the baseline conventions for shared auth request/response contracts and how to detect drift across workspaces.

Backlog-IDs:
- AUTH-106 (define)
- AUTH-107 (wire)
- AUTH-108 (monitor)

## Goal

Keep auth contracts (DTOs + error codes) defined once, reused everywhere, and easy to evolve without duplicating types in each app.

## Ownership boundaries

- `packages/types` is the source of truth for:
  - request/response DTOs (`RegistrationInput`, `LoginResult`, etc.)
  - error code unions (`LoginErrorCode`, `VerificationErrorCode`, etc.)
  - shared service payload shapes (`ServiceStatus`, `AuthBootstrap`, `StellarServiceInfo`)
- Apps **must not** re-declare these DTOs locally. They should import from `@qyou/types`.

## Contract naming conventions

- `*Input` is the request body shape for an endpoint.
- `*Result` is the response union (success | failure).
- `*ErrorCode` is a string-union used by failure cases.

Example:
- `LoginInput` → request body for `POST /api/v1/auth/login`
- `LoginResult` → `200` success union, or `{ ok:false, code, message }`

## Wiring the contracts into workspaces

If a workspace needs to call an auth endpoint, it should:
1) add `@qyou/types` as a dependency, then
2) import the relevant `*Input` / `*Result` types and use them in client code.

## Monitoring drift

Run the contracts audit:

```bash
npm run auth:contracts
```

This does two things:
- builds `@qyou/types` to ensure the contract layer typechecks
- scans the repo for duplicate auth contract type declarations outside `packages/types`

If the audit fails, remove the duplicate local type and import from `@qyou/types` instead.

