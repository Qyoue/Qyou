# Phase 4 Shared Auth Contracts — Responsibility Split

This document separates the responsibilities for shared auth contracts and schema evolution at
Phase 4, where multiple phase-specific contracts now coexist.

## Architectural Guidelines

1. **`@qyou/shared` owns contract definition and versioning**:
   - `packages/shared/src/validation/contract-evolution.schemas.ts` and
     `token-handling-phase4.schemas.ts`: phase-specific contracts live beside the base
     `auth.schemas.ts` rather than replacing it.
   - `packages/shared/src/index.ts`: the single export surface.

2. **`apps/api` owns which contract applies**:
   - `apps/api/src/modules/auth/validators/contract-evolution.validator.ts` and
     `token-handling-phase4.validator.ts`: selecting and applying the right phase validator.
   - The API decides *which* contract a request is evaluated against; `@qyou/shared` only defines
     what each contract is.

3. **`apps/web` owns none of it**:
   - `apps/web/src/lib/contract-evolution-client.ts` and `token-handling-phase4-client.ts` consume
     the contracts. They do not choose between phases on their own.

## The Phase-4 Hazard

With several phase contracts live at once, the real risk is no longer a missing rule — it is **two
rules disagreeing**. Ownership must stay unambiguous:

- A payload is validated by exactly one phase contract per request.
- Phase contracts are additive files, never edits to an earlier phase's schema.
- When phases disagree, the API's selection logic is the tiebreak — not import order.

## Verification

`npm run typecheck` at the root spans every workspace, so a consumer importing a contract the API no
longer selects fails at compile time rather than silently validating against the wrong phase.
