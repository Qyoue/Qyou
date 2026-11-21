# Phase 2 Shared Auth Contracts Rollout

This document sets out the rollout plan for Phase 2 shared auth contract and schema evolution
changes across `@qyou/shared`, `apps/api`, and `apps/web`.

## Architectural Guidelines

1. **The shared package leads**:
   - `packages/shared/src/validation/auth.schemas.ts` and
     `packages/shared/src/types/auth.types.ts` ship first. The root `postinstall` and `build`
     scripts already build `@qyou/shared` ahead of the apps, so consumers compile against the new
     contract rather than a stale one.

2. **The API adopts next**:
   - `apps/api/src/modules/auth/`: adopts the new contract while continuing to accept the previous
     payload shape, so no client is broken mid-rollout.

3. **The web app adopts last**:
   - `apps/web/src/lib/api-client.ts` and `auth-context.tsx`: updated once the API accepts both
     shapes.

## Rollout Sequence

1. **Publish the contract.** Merge shared changes; confirm `@qyou/shared` builds.
2. **Adopt in the API.** Deploy with both shapes accepted; confirm existing clients still work.
3. **Adopt in the web app.** Deploy; confirm auth flows end to end.
4. **Remove the compatibility path.** Only once no client sends the old shape.

## Rollback

Steps 1–3 are independently revertible because step 2 keeps the API backward compatible. Step 4 is
the point of no return: after it, rolling back the web app breaks auth, so it must be a separate
deployment rather than bundled with step 3.
