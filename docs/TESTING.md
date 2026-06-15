# Testing Guide

## Running tests

```bash
# All workspaces
npm run test

# A single workspace
npm run test -w @qyou/api
npm run test -w @qyou/web
npm run test -w @qyou/mobile
```

`@qyou/shared` and `@qyou/stellar` currently have no runtime tests — their CI pipeline validates
`build` and `lint` instead (see [CI expectations](#ci-expectations) below).

## Test structure

### `apps/api`

* `src/modules/auth/tests/auth.service.test.ts` — unit tests for `AuthService` using
  `InMemoryAuthRepository`. Covers:
  * successful registration
  * duplicate email handling
  * successful login
  * login with an incorrect password
  * login for a non-existent account
* `src/modules/auth/tests/auth.routes.test.ts` — `supertest`-based route tests covering the same
  cases end-to-end through `createApp()`, also using `InMemoryAuthRepository` so no database is
  required.

Both suites run via Node's built-in test runner (`node --import tsx --test`).

### `apps/web`

* `src/app/login/page.test.tsx` — renders the login page and checks validation errors for an
  invalid email and empty password.
* `src/app/register/page.test.tsx` — renders the create-account page and checks validation
  errors for an invalid email and a too-short password.

Both use Jest with `@testing-library/react` via the `next/jest` preset.

### `apps/mobile`

* `src/utils/__tests__/setup.test.ts` — a basic setup-verification test confirming the
  `jest-expo` + TypeScript pipeline runs correctly. No auth, screen, or feature tests exist yet —
  this app is foundation-only.

## CI expectations

| Workflow                          | Workspace(s)                      | Steps                          |
| ---------------------------------- | ----------------------------------- | --------------------------------- |
| `.github/workflows/backend.yml`   | `@qyou/api`                        | install → lint → test → build   |
| `.github/workflows/web.yml`       | `@qyou/web`                        | install → lint → test → build   |
| `.github/workflows/mobile.yml`    | `@qyou/mobile`                     | install → lint → test           |
| `.github/workflows/packages.yml`  | `@qyou/shared`, `@qyou/stellar`    | install → build → lint          |

Every pull request runs all four workflows. A failing lint, test, or build step fails CI and
blocks the PR.
