# Phase 4 Password, Email & Account Safety — End-to-End Coverage

This document specifies the end-to-end coverage expected for Phase 4 password, email, and account
safety flows.

## Architectural Guidelines

1. **Schema coverage**:
   - `packages/shared/src/validation/account-safety.schemas.ts` and
     `account-safety-phase3.schemas.ts`: passing and failing payloads asserted directly.

2. **Service coverage**:
   - `apps/api/src/modules/auth/services/account-safety.service.ts` via
     `apps/api/src/modules/auth/tests/auth.service.test.ts`.

3. **Route coverage**:
   - `apps/api/src/modules/auth/routes/auth.routes.ts` via
     `apps/api/src/modules/auth/tests/auth.routes.test.ts`.

## Cases That Must Be Covered

| Case | Assertion |
|---|---|
| Happy path | The change applies and is persisted |
| Rejected payload | Validation fails and **no state is mutated** |
| Repeated request | Replaying produces no second effect |
| Cross-phase payload | Valid under an earlier phase, still handled predictably |

## Why the Rejected Path Matters Most

A safety rule that rejects correctly but has already written part of its change is worse than no rule
at all: the account ends up in a state no code path intended, and the caller was told it failed.
Asserting "rejected" is not enough — the test must assert **nothing changed**.

## Rule

Phase 4 coverage is complete only when every row above is asserted end to end. Schema-level tests
alone prove the rule is expressible, not that any caller enforces it.
