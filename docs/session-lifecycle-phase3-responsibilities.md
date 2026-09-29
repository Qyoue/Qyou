# Phase 3 Session Lifecycle & Token Handling — Responsibility Split

This document separates the responsibilities for session lifecycle and token handling at Phase 3, so
that no two layers both believe they own the session.

## Architectural Guidelines

1. **`@qyou/shared` owns the shape**:
   - `packages/shared/src/validation/auth.schemas.ts` and
     `packages/shared/src/types/auth.types.ts`: what a session and a token *are*. No lifetime
     policy, no storage.

2. **`apps/api` owns the lifetime**:
   - `apps/api/src/modules/auth/services/auth.service.ts`: issues, refreshes, and revokes. The API
     is the only authority on whether a session is still valid.
   - `apps/api/src/modules/auth/repositories/`: persists session state.

3. **`apps/web` owns the local copy**:
   - `apps/web/src/lib/auth-storage.ts`: persists the client's copy.
   - `apps/web/src/lib/auth-context.tsx`: exposes it to components.
   - `apps/web/src/lib/web-auth-sync.ts`: keeps tabs consistent.

## The Split That Matters

The web app holds a **cache**, not the truth. It may decide *when to ask* — for example, refreshing
proactively before expiry — but it must never decide that a session is still valid when the API says
otherwise.

Practically: a client-side expiry check is an optimisation to avoid a doomed request. It is not
authorisation. If the two disagree, the API wins and the client discards its copy.

## Consequence

Because the API is authoritative, revocation works: clearing server-side state ends the session on
the next request regardless of what the browser still holds.
