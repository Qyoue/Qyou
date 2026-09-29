# Phase 2 Session Lifecycle & Token Handling Validation

This document records the Phase 2 validation rules for session lifecycle and token handling, so that
route, service, and form layers reject the same input for the same reasons.

## Architectural Guidelines

1. **Contract-first validation**:
   - `packages/shared/src/validation/auth.schemas.ts`: the shared zod schemas remain the single
     source of truth. Phase 2 tightening extends these schemas rather than adding parallel checks
     inside `apps/api` or `apps/web`.

2. **Service-level enforcement**:
   - `apps/api/src/modules/auth/services/auth.service.ts`: session and token operations validate
     through the shared schemas before touching the repository layer, so an invalid session never
     reaches persistence.

3. **Route-level enforcement**:
   - `apps/api/src/modules/auth/routes/auth.routes.ts`: request bodies are parsed with the same
     schemas, so a rejected payload produces the same error shape whether it fails at the route or
     in the service.

4. **Web parity**:
   - `apps/web/src/lib/auth-context.tsx` and `apps/web/src/lib/api-client.ts` surface the API's
     validation errors unchanged, rather than re-deriving their own messages.

## Validation Rules

- A session is invalid if its expiry is absent, non-numeric, or already in the past.
- A token is invalid if it is empty, malformed, or missing its expiry claim.
- Validation failures are reported as errors, never as a silent fallback to "no session".

## Test Expectations

- `apps/api/src/modules/auth/tests/auth.service.test.ts`: service-level rejection paths.
- `apps/api/src/modules/auth/tests/auth.routes.test.ts`: route-level integration paths.
