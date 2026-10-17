# Phase 4 Registration & Login Hardening Rollout

This document sets out the rollout plan for Phase 4 registration and login hardening.

## Architectural Guidelines

1. **Shared contracts first**:
   - `packages/shared/src/validation/login-hardening.schemas.ts` and `login-security.schemas.ts`
     ship ahead of consumers; the root build compiles `@qyou/shared` before the apps.

2. **API next, in report-only mode**:
   - `apps/api/src/modules/auth/validators/login-hardening.validator.ts` and
     `login-security.validator.ts`: evaluate the new rules and record outcomes **before** they begin
     rejecting traffic.

3. **Web last**:
   - `apps/web/src/lib/api-client.ts` and `auth-context.tsx`: updated to surface the new rejection
     reasons once enforcement is on.

## Rollout Sequence

1. Merge shared schemas; confirm `@qyou/shared` builds.
2. Deploy the API **evaluating but not enforcing**; observe how much real traffic the new rules would
   have rejected.
3. Turn on enforcement once that number is understood.
4. Deploy the web app to render the new rejection reasons clearly.

## Why Step 2 Is Not Optional

Hardening rules reject real users, not just attackers. A password or attempt-limit rule that looks
reasonable can lock out a meaningful share of legitimate sign-ins, and enforcement-first deployment
discovers this from support tickets rather than from data. Report-only makes the blast radius
measurable while it is still reversible.

## Rollback

Steps 1–2 are inert and safe to revert. Step 3 is the behaviour change: keep it a separate,
independently revertible deploy so enforcement can be switched off without reverting the contracts.
