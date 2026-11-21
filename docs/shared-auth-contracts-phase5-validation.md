# Phase 5 Shared Auth Contracts & Schema Evolution Validation

This document outlines Phase 5 validation rules, contract assertion tokens, and schema evolution matrices for authentication modules.

## Technical Rules

1. **Assertion Validation**:
   - `apps/api/src/modules/auth/validators/contract-evolution-phase5.validator.ts`: `validatePhase5Contract` function asserting incoming version compatibility matrices.

2. **Web Client Request Headers**:
   - `apps/web/src/lib/contract-evolution-phase5-client.ts`: Generates Phase 5 assertion headers `x-phase5-contract` and `x-phase5-min-version`.

3. **Validation Schemas & Interfaces**:
   - Defined `phase5CompatibilitySchema` and `contractAssertionTokenSchema` in `@qyou/shared`.
