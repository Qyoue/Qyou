# Phase 2 Shared Auth Contracts — Responsibility Split

This document separates the responsibilities for shared auth contracts and schema evolution, so that
each layer owns one job and the same rule is not implemented twice.

## Architectural Guidelines

1. **`@qyou/shared` owns the contract**:
   - `packages/shared/src/validation/auth.schemas.ts`: defines what a valid payload is.
   - `packages/shared/src/types/auth.types.ts`: defines the types derived from those schemas.
   - It owns shape and constraints. It does not know about HTTP, storage, or React.

2. **`apps/api` owns enforcement and persistence**:
   - `apps/api/src/modules/auth/services/auth.service.ts`: applies business rules.
   - `apps/api/src/modules/auth/repositories/`: owns storage.
   - `apps/api/src/modules/auth/routes/auth.routes.ts`: owns transport and status codes.
   - The API decides what an invalid payload *means*; it does not redefine what invalid *is*.

3. **`apps/web` owns presentation**:
   - `apps/web/src/lib/auth-context.tsx`: owns client session state.
   - `apps/web/src/lib/api-client.ts`: owns transport to the API.
   - The web app renders errors the API returns; it does not invent its own validation messages.

## Boundary Rule

Validation logic belongs in `@qyou/shared`. If a rule is duplicated in `apps/api` or `apps/web`, the
two copies will drift, and the drift will only surface as inconsistent error messages in production.
