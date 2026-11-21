# Phase 4 Session Lifecycle & Token Handling — Responsibility Split

This document separates the responsibilities for session lifecycle and token handling at Phase 4,
where proactive client-side refresh is in play.

## Architectural Guidelines

1. **`@qyou/shared` owns the shape**:
   - `packages/shared/src/validation/token-handling-phase4.schemas.ts` and
     `packages/shared/src/types/token-handling-phase4.types.ts`: what a token and its lifetime
     fields are. No policy.

2. **`apps/api` owns authority**:
   - `apps/api/src/modules/auth/validators/token-handling-phase4.validator.ts`:
     `evaluatePhase4TokenState` evaluates expiry and active renewal windows.
   - `apps/api/src/modules/auth/services/auth.service.ts`: issues, refreshes, revokes.

3. **`apps/web` owns timing, not truth**:
   - `apps/web/src/lib/token-handling-phase4-client.ts`: inspects token lifetime to decide whether a
     proactive renewal is worth making.

## The Distinction Phase 4 Depends On

The client now decides **when to ask** for a refresh. It still does not decide **whether the session
is valid**. Those two look similar and are not:

- *When to ask* is an optimisation. Getting it wrong costs an extra request or a brief stall.
- *Whether it is valid* is authorisation. Getting it wrong is a security bug.

`token-handling-phase4-client.ts` may therefore read expiry locally to schedule work, but a token the
client believes is fine is still rejected if the API disagrees.

## Consequence

Revocation continues to work under proactive refresh: the server clearing its state ends the session
on the next call, no matter what the client's local inspection concluded.
