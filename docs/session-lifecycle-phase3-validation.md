# Phase 3 Session Lifecycle & Token Handling Validation

This document records the Phase 3 validation rules for session lifecycle and token handling, building
on the Phase 2 rules rather than replacing them.

## Architectural Guidelines

1. **Shared schemas remain authoritative**:
   - `packages/shared/src/validation/auth.schemas.ts`: session and token payload shapes.
   - Phase 3 narrows these schemas; it does not introduce a second validation path.

2. **Service-level checks**:
   - `apps/api/src/modules/auth/services/auth.service.ts`: validates before issuing or refreshing,
     so an invalid session is never persisted or returned.

3. **Route-level checks**:
   - `apps/api/src/modules/auth/routes/auth.routes.ts`: parses with the same schemas so the error
     shape is identical whether a request fails at transport or in the service.

4. **Client parity**:
   - `apps/web/src/lib/auth-storage-hydrator.ts`: validates rehydrated state against the shared
     schema before trusting it, rather than casting whatever was stored.

## Validation Rules

- **Expiry must be present and numeric.** A session with an absent or unparseable expiry is invalid,
  not "valid until proven otherwise".
- **Rehydrated state is untrusted input.** Stored state can be edited by anyone with the browser; it
  is validated on read exactly like a network payload.
- **A failed check is an error, not a downgrade.** Falling back to an anonymous state silently hides
  the reason from both the user and the logs.

## Test Expectations

- `apps/api/src/modules/auth/tests/auth.service.test.ts`: issue, refresh, and revoke paths.
- `apps/api/src/modules/auth/tests/auth.routes.test.ts`: the same rules through the route.
