# Phase 3 Password, Email & Account Safety — End-to-End Coverage

This document specifies the end-to-end coverage expected for Phase 3 password, email, and account
safety flows.

## Architectural Guidelines

1. **Schema-level coverage**:
   - `packages/shared/src/validation/account-safety.schemas.ts` and
     `account-safety-phase3.schemas.ts`: each rule is exercised with a passing and a failing payload
     directly against the schema.

2. **Service-level coverage**:
   - `apps/api/src/modules/auth/services/account-safety.service.ts`, covered by
     `apps/api/src/modules/auth/tests/auth.service.test.ts`.

3. **Route-level coverage**:
   - `apps/api/src/modules/auth/routes/auth.routes.ts`, covered by
     `apps/api/src/modules/auth/tests/auth.routes.test.ts`.

## What End-to-End Means Here

A safety flow is only covered when a single scenario is asserted from payload to persisted outcome.
Three specific cases must be covered because each fails differently:

- **The happy path** — the change applies and is persisted.
- **The rejected path** — validation fails and **nothing is mutated**. This is the case unit tests
  most often miss: a rule can reject correctly while a partial write has already happened.
- **The idempotent repeat** — replaying the same request does not produce a second effect.

## Rule

Coverage that stops at the schema proves the rule is expressible, not that it is enforced. Every row
above must be asserted for a Phase 3 safety flow to count as covered.
