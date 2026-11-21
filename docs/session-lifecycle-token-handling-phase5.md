# Session Lifecycle & Token Handling (Phase 5)

This specification defines the responsibility split, package boundary wiring, and E2E test coverage for session lifecycle and JWT token handling.

## Phase 5 Design
- **Responsibility Split**: `@qyou/shared` owns schemas and type exports; `apps/api` handles token signing & revocation; `apps/web` handles token storage & refresh interceptors.
- **Package Boundary**: Wired through `@qyou/shared` for token payload schemas.
- **E2E Test Coverage**: Validated in `scripts/__tests__/session-lifecycle-phase5.test.ts`.
