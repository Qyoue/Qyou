# Shared Auth Contracts & Schema Evolution (Phase 4)

This document covers Phase 4 shared authentication contracts and schema evolution boundaries for `@qyou/shared`, `apps/api`, and `apps/web`.

## Phase 4 Schema Evolution & Account Safety Boundaries

1. **Contracts Added to `@qyou/shared`**:
   - `AuthContractVersion`: Metadata interface tracking active authentication schema versions and feature flags.
   - `SchemaEvolutionConfig`: Configuration for strict vs legacy schema migration modes.
   - `PasswordSafetyPolicy` & `AccountSafetyPayload`: Type definitions for password safety rules and lockout/safety enforcement.

2. **Validation Schemas**:
   - `passwordSafetySchema`: Validates password update requests.
   - `accountSafetySchema`: Validates account lock/unlock operations.
   - `schemaEvolutionSchema`: Validates runtime contract compatibility header values.

3. **API Validator Wiring**:
   - `apps/api/src/modules/auth/validators/auth.validators.ts`: Re-exports Phase 4 schemas and types directly from `@qyou/shared`.
