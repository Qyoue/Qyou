# Phase 4 Password, Email & Account Safety — Package Boundary

This document defines the package boundary for Phase 4 password, email, and account safety flows.

## Architectural Guidelines

1. **Contracts live in `@qyou/shared`**:
   - `packages/shared/src/validation/account-safety.schemas.ts` and
     `account-safety-phase3.schemas.ts`: payload shapes and rules.
   - `packages/shared/src/types/account-safety.types.ts`: derived types.
   - Consumers import through `packages/shared/src/index.ts` only.

2. **Enforcement lives in `apps/api`**:
   - `apps/api/src/modules/auth/services/account-safety.service.ts`: applies the rules.
   - `apps/api/src/modules/auth/validators/account-safety-phase3.validator.ts`: the phase-specific
     validator.
   - `apps/api/src/modules/auth/repositories/`: the only layer that persists.

3. **`apps/web` consumes, never re-implements**:
   - `apps/web/src/lib/api-client.ts`: sends payloads typed from the shared contract.

## What Must Not Cross

- **No secrets or hashing in `@qyou/shared`.** The shared package describes *what a valid password
  looks like*; it never handles, hashes, or compares one. Credential handling stays server side.
- **No storage adapters in `@qyou/shared`.** Persistence belongs to the API's repository layer.
- **No dependency from `@qyou/shared` back to `apps/*`.**

## Why This Boundary Is Stricter Here

`@qyou/shared` is consumed by `apps/web` and therefore reachable from the browser bundle. Anything
placed in it should be assumed to be public. That constraint is what keeps account safety rules
shareable while the credentials they guard are not.
