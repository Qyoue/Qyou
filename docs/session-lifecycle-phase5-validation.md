# Phase 5 Session Lifecycle & Token Handling Validation

This document specifies Phase 5 token validation rules, JWT rotation schemas, and authorization header parsing.

## Technical Rules

1. **Header Parsing & Validation**:
   - `apps/api/src/modules/auth/validators/token-validation-phase5.validator.ts`: Safe parsing for incoming bearer tokens via `authTokenHeaderSchema`.

2. **Web Client Checks**:
   - `apps/web/src/lib/token-validation-phase5-client.ts`: Token structure validation helper prior to API dispatch.

3. **Validation Schemas & Interfaces**:
   - `tokenRotationClaimSchema` and `authTokenHeaderSchema` defined in `@qyou/shared`.
