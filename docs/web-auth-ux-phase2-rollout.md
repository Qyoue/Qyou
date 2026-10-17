# Phase 2 Web Auth UX & State Persistence Rollout

This document sets out the rollout plan for Phase 2 web auth UX and state persistence changes.

## Architectural Guidelines

1. **Shared state contracts first**:
   - `packages/shared/src/validation/web-auth-state.schemas.ts` and
     `packages/shared/src/validation/auth-persistence.schemas.ts`: the persisted-state shape is a
     contract, so it ships before the client that writes it.

2. **Persistence layer next**:
   - `apps/web/src/lib/auth-storage.ts` and `auth-storage-hydrator.ts`: writing and rehydrating
     stored auth state. This changes what lives in a user's browser, so it rolls out before any UI
     depends on the new shape.

3. **UX last**:
   - `apps/web/src/lib/auth-context.tsx` and `web-auth-sync.ts`: the context and cross-tab sync
     consume hydrated state once the storage format is live.

## Rollout Sequence

1. Merge shared state schemas; confirm `@qyou/shared` builds.
2. Ship the persistence layer able to **read both** the old and new stored shapes.
3. Ship the UX changes.
4. Drop the old-shape reader once returning users have re-authenticated.

## The Returning-User Problem

Unlike an API rollout, stored state is already on users' machines and cannot be migrated server
side. Step 2 must therefore tolerate the previous shape rather than assume the new one — a hydrator
that throws on an unrecognised value logs every returning user out on deploy.

## Rollback

Steps 1–3 revert cleanly while step 2 still reads both shapes. After step 4, a rollback strands
anyone whose stored state was written in the new format, so schedule it as its own deployment.
