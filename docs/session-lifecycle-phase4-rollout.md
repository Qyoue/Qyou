# Phase 4 Session Lifecycle & Token Handling Rollout

This document sets out the rollout plan for Phase 4 session lifecycle and token handling, which adds
proactive client-side token renewal.

## Architectural Guidelines

1. **Shared contracts first**:
   - `packages/shared/src/validation/token-handling-phase4.schemas.ts` and
     `packages/shared/src/types/token-handling-phase4.types.ts` ship ahead of consumers.

2. **API next**:
   - `apps/api/src/modules/auth/validators/token-handling-phase4.validator.ts`: must accept refresh
     requests from clients that renew *early* before any client starts doing so.

3. **Web last**:
   - `apps/web/src/lib/token-handling-phase4-client.ts`: begins proactive renewal only once the API
     accepts it.

## Rollout Sequence

1. Merge shared schemas; confirm `@qyou/shared` builds.
2. Deploy the API accepting both reactive (on-expiry) and proactive (early) refresh.
3. Deploy the web app with proactive renewal enabled.
4. Retire the reactive-only path once clients have updated.

## The Ordering Constraint

Steps 2 and 3 cannot be swapped or bundled. A client that renews early against an API that only
accepts refresh at expiry gets its request rejected — and because renewal runs on a timer rather than
on user action, the failure appears as unexplained sign-outs rather than a failed click.

## Rollback

Steps 1–3 revert independently while step 2 accepts both refresh styles. Step 4 removes that
tolerance, so run it as its own deployment once client traffic confirms nobody relies on the old
path.
