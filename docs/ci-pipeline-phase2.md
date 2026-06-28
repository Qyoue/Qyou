# CI Pipeline Stability and Reproducibility

This document describes the CI pipeline stability and reproducibility guarantees for the Qyou monorepo.

## Workflow architecture

Four independent workflows run in parallel on every push and pull request:

```
backend.yml  → @qyou/api:   install → lint → test → build
web.yml      → @qyou/web:   install → lint → test → build
mobile.yml   → @qyou/mobile: install → lint → test
packages.yml → shared packages: install → build → lint
```

## Stability guarantees

### Deterministic builds

- All workflows use `npm ci` (not `npm install`) for reproducible dependency resolution.
- Node version is pinned to 20 via `actions/setup-node@v4`.
- npm cache is enabled to speed up installs.

### Failure isolation

- Each workflow runs independently — a backend test failure does not block mobile or web.
- Within a workflow, steps are sequential — a lint failure stops that workflow before build.
- No workflow shares state or artifacts with another.

### Reproducibility

Running the same commit on the same ref always produces the same result because:

1. `npm ci` respects the lockfile (`package-lock.json`).
2. ESLint and TypeScript versions are locked in `devDependencies`.
3. Workspaces are isolated — shared packages are built first via `postinstall`.

## Testing pipeline stability

The `ci-pipeline-stability.test.ts` script validates:

- Every workflow file has the required top-level keys (name, on, jobs, runs-on)
- Expected steps (install, lint, test, build) exist in correct order
- Install step precedes lint step
- Uses `npm ci` instead of `npm install`

## Hardening

The `ci-pipeline-hardening.ts` script checks:

- No deprecated `::set-output` syntax
- Actions are pinned to specific versions (not `@main` or `@master`)
- `timeout-minutes` is set
- `shell: bash` is explicitly set
- npm cache is configured

## Local CI simulation

```bash
# Simulate CI pipeline locally
npm run typecheck  # TypeScript checking
npm run lint       # ESLint
npm run test       # Tests
npm run build      # Build
```
