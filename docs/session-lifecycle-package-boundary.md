# Session Lifecycle and Token Handling Package Boundary

This document describes the wired `@qyou/shared` package boundary for session lifecycle management and token handling across the monorepo services (`apps/api` and `apps/web`).

## Package Boundary Contracts

1. **Shared Types (`@qyou/shared`)**:
   - `SessionLifecyclePayload`: Schema defining session metadata (`sessionId`, `userId`, `issuedAt`, `expiresAt`, `isValid`).
   - `TokenRefreshInput`: Contract for token refresh operations containing `refreshToken`.
   - `TokenRefreshResponse`: Contract returning new token sets (`accessToken`, optional `refreshToken`, `expiresIn`).
   - `SessionState`: Shared frontend session status interface (`user`, `status: 'active' | 'expired' | 'revoked'`, `lastActiveAt`).

2. **Shared Validation Schemas (`@qyou/shared`)**:
   - `tokenRefreshSchema`: Zod validation for refresh token requests.
   - `sessionValidationSchema`: Zod validation for session verification queries.

3. **API & Client Integration**:
   - `apps/web/src/lib/api-client.ts`: Provides `refreshToken` and `validateSession` helpers driven by shared contracts.
