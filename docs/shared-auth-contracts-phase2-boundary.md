# Phase 2 Shared Auth Contracts — Package Boundary

This document defines how `@qyou/shared` is consumed across the workspace for Phase 2 auth contract
work, and what must not cross the boundary.

## Architectural Guidelines

1. **Single public entry point**:
   - `packages/shared/src/index.ts` is the only surface consumers import from. Deep imports into
     `packages/shared/src/validation/*` or `packages/shared/src/types/*` bypass the boundary and
     couple consumers to the internal file layout.

2. **Build order is enforced by the workspace**:
   - The root `postinstall` and `build` scripts build `@qyou/shared` before the apps, so a consumer
     never compiles against stale contract output.

3. **Consumers**:
   - `apps/api/src/modules/auth/`: imports schemas and types for enforcement.
   - `apps/web/src/lib/api-client.ts` and `auth-context.tsx`: import the same types so request and
     response shapes cannot drift between client and server.

## What Must Not Cross

- **No app-specific code in `@qyou/shared`.** No Express types, no React types, no storage adapters.
- **No dependency from `@qyou/shared` back to `apps/*`.** The dependency arrow points one way only.
- **No duplicated schema definitions in consumers.** Extend the shared schema instead.

## Verification

`npm run typecheck` at the root covers every workspace, so a broken boundary surfaces as a type
error rather than as a runtime mismatch.
