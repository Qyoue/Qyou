# Phase 4 Registration & Login Hardening — Package Boundary

This document defines the package boundary for Phase 4 registration and login hardening.

## Architectural Guidelines

1. **Contracts in `@qyou/shared`**:
   - `packages/shared/src/validation/login-hardening.schemas.ts` and
     `login-security.schemas.ts`: registration and login payload shapes and constraints.
   - `packages/shared/src/types/login-hardening.types.ts`: the derived types.
   - Consumed through `packages/shared/src/index.ts` only.

2. **Enforcement in `apps/api`**:
   - `apps/api/src/modules/auth/validators/login-hardening.validator.ts` and
     `login-security.validator.ts`: apply the hardening rules.
   - `apps/api/src/modules/auth/services/auth.service.ts`: owns the decision to accept or reject.

3. **Consumption in `apps/web`**:
   - `apps/web/src/lib/api-client.ts`: sends payloads typed from the shared contract.

## What Must Not Cross

- **No rate-limit or lockout state in `@qyou/shared`.** Hardening counters are server-side state; a
  browser-visible copy is advisory at best and an attacker's roadmap at worst.
- **No credential handling in `@qyou/shared`.** The package defines what a valid credential *looks
  like*, never how one is stored or compared.
- **No dependency from `@qyou/shared` back to `apps/*`.**

## The Asymmetry Worth Naming

Hardening rules are deliberately split: the *shape* rules are shared so the form and the API agree,
but the *defensive* rules — attempt limits, backoff, lockout — stay entirely in the API. Sharing the
first improves UX; sharing the second would publish the thresholds an attacker needs to stay under.

## Verification

`npm run typecheck` at the root covers every workspace, so a boundary violation surfaces at compile
time.
