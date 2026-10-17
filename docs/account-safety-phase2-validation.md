# Phase 2 Password, Email & Account Safety Validation

This document records the Phase 2 validation rules for password, email, and account safety flows,
keeping the rules in one place across API routes, services, and web forms.

## Architectural Guidelines

1. **Shared schemas own the rules**:
   - `packages/shared/src/validation/account-safety.schemas.ts`: password strength, email format,
     and account safety payload shapes.
   - `packages/shared/src/types/account-safety.types.ts`: the derived types consumers use.

2. **Service enforcement**:
   - `apps/api/src/modules/auth/services/account-safety.service.ts`: applies the rules before any
     state change, so a rejected request never partially mutates an account.

3. **Route and form parity**:
   - `apps/api/src/modules/auth/routes/auth.routes.ts` parses with the shared schema.
   - `apps/web/src/lib/api-client.ts` sends payloads typed from the same contract, so a form cannot
     submit a shape the API will refuse.

## Validation Rules

- **Email** must be structurally valid and normalised consistently before comparison, so that
  case differences never create a duplicate account.
- **Password** must satisfy the shared strength schema. The rule lives in the schema, not in the
  form, so the API cannot be bypassed by calling it directly.
- **Failures are explicit.** A safety check that cannot complete is an error, never a silent pass.

## Test Expectations

- `apps/api/src/modules/auth/tests/auth.service.test.ts`: rejection paths per rule.
- `apps/api/src/modules/auth/tests/auth.routes.test.ts`: the same rules through the route.
