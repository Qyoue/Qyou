# Phase 2 Session Lifecycle & Token Handling Rollout

This document sets out the rollout plan for Phase 2 session lifecycle and token handling changes,
covering the order of deployment and how to back out.

## Architectural Guidelines

1. **Shared contracts ship first**:
   - `packages/shared/src/validation/auth.schemas.ts` and
     `packages/shared/src/types/auth.types.ts` are published before either app consumes them, since
     `@qyou/shared` builds ahead of the workspaces in the root `build` script.

2. **API before web**:
   - `apps/api/src/modules/auth/services/auth.service.ts` and
     `apps/api/src/modules/auth/routes/auth.routes.ts` roll out next. The API tolerates clients that
     have not yet updated.

3. **Web last**:
   - `apps/web/src/lib/auth-context.tsx` and `apps/web/src/lib/auth-storage.ts` are updated once the
     API is live, so the browser never depends on an endpoint that has not shipped.

## Rollout Sequence

1. Merge shared contract changes; confirm `@qyou/shared` builds.
2. Deploy the API; confirm existing sessions still authenticate.
3. Deploy the web app; confirm sign-in, refresh, and sign-out.

## Rollback

Each step is independently revertible. Because the API stays backward compatible through step 2,
rolling back the web app alone restores the previous behaviour without invalidating live sessions.
