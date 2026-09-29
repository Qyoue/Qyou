# Phase 4 Shared Auth Contracts Validation

This document records how validation is tightened for Phase 4 shared auth contracts and schema
evolution.

## Architectural Guidelines

1. **Phase contracts are additive**:
   - `packages/shared/src/validation/contract-evolution.schemas.ts` and
     `token-handling-phase4.schemas.ts`: Phase 4 tightening adds or narrows within these, leaving
     earlier phase schemas untouched so existing consumers keep validating.

2. **Validators apply them**:
   - `apps/api/src/modules/auth/validators/contract-evolution.validator.ts` and
     `token-handling-phase4.validator.ts`: the enforcement point. Rules live in the schema; the
     validator decides when to run it.

3. **Client parity**:
   - `apps/web/src/lib/contract-evolution-client.ts` and `token-handling-phase4-client.ts` use the
     shared types, so a tightened field breaks the build rather than a user's request.

## Validation Rules

- **Narrow in the schema, not the validator.** A check added only in a validator is invisible to
  every other consumer and to typecheck.
- **A tightened field must be typechecked across the workspace** before merge, since consumers
  compile against the shared build.
- **Unknown fields are rejected, not ignored.** Silently dropping an unrecognised field hides the
  fact that a client is sending against the wrong phase contract.

## Test Expectations

- `apps/api/src/modules/auth/tests/auth.service.test.ts`: service behaviour per phase contract.
- `apps/api/src/modules/auth/tests/auth.routes.test.ts`: the same payloads through the route,
  including one that is valid under an earlier phase but invalid under Phase 4.
